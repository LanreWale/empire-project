// netlify/functions/paystack-transfer.js
"use strict";

/**
 * Paystack Transfer Bridge
 * - Body parsing is tolerant (JSON or form-encoded; base64 too)
 * - Accepts either recipientCode, or bank_code+account_number(+name) to create recipient
 * - Minimum withdrawal enforced via MIN_WITHDRAW_USD (default 300)
 * - USD->NGN via USD_NGN_RATE env (e.g. 1600). Amount sent to Paystack is in kobo.
 * - Debug: add ?debug=1 to see raw/parsed body and headers.
 */

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(obj),
});

const PAYSTACK_SECRET_KEY = (process.env.PAYSTACK_SECRET_KEY || "").trim();
const MIN_WITHDRAW_USD    = Number(process.env.MIN_WITHDRAW_USD || 300);
const USD_NGN_RATE        = Number(process.env.USD_NGN_RATE || 1600); // update this env when needed

async function parseBody(event) {
  try {
    let raw = event.body || "";
    if (event.isBase64Encoded) {
      raw = Buffer.from(raw, "base64").toString("utf8");
    }

    // Try JSON first
    try {
      if (raw) return { raw, data: JSON.parse(raw) };
    } catch (_) {}

    // Try form-encoded
    const ct = (event.headers?.["content-type"] || event.headers?.["Content-Type"] || "").toLowerCase();
    if (ct.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(raw);
      const obj = {};
      for (const [k, v] of params.entries()) obj[k] = v;
      return { raw, data: obj };
    }

    // Nothing workable
    return { raw, data: {} };
  } catch (e) {
    return { raw: event.body || "", data: {}, error: String(e) };
  }
}

function usdToKobo(usd) {
  // Convert USD -> NGN using env rate, then to Kobo (integer)
  const ngn = Number(usd) * USD_NGN_RATE;
  return Math.round(ngn * 100);
}

async function paystack(path, method, payload) {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Missing PAYSTACK_SECRET_KEY");
  const r = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.status === false) {
    const msg = data?.message || data?.error || `Paystack ${r.status}`;
    const raw = typeof data === "object" ? data : { raw: String(data) };
    throw Object.assign(new Error(msg), { status: r.status, raw });
  }
  return data;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      if (event.queryStringParameters?.debug === "1") {
        // Lightweight probe
        const parsed = await parseBody(event);
        return RESP(200, {
          ok: true,
          note: "POST JSON here. This is debug echo.",
          headers: event.headers,
          raw: parsed.raw,
          parsed: parsed.data,
        });
      }
      return RESP(405, { ok: false, error: "Method not allowed" });
    }

    const parsed = await parseBody(event);
    const b = parsed.data || {};

    // Normalize inputs (accept multiple synonyms)
    const amountUSD = Number(b.amountUSD ?? b.amount ?? b.usd ?? 0);
    const bank_code = String(b.bank_code ?? b.bankCode ?? "").trim();
    const account_number = String(b.account_number ?? b.accountNumber ?? "").trim();
    const name = String(b.name ?? b.account_name ?? "").trim();
    let recipientCode = String(b.recipientCode ?? b.recipient_code ?? "").trim();
    const reason = String(b.reason ?? "Affiliate withdrawal").trim();
    const reference = String(b.reference ?? "").trim();

    // Debug view
    if (event.queryStringParameters?.debug === "1") {
      return RESP(200, {
        ok: true,
        debug: true,
        headers: event.headers,
        isBase64Encoded: !!event.isBase64Encoded,
        raw: parsed.raw,
        parsed: b,
        normalized: {
          amountUSD, bank_code, account_number, name, recipientCode, reason, reference,
        },
      });
    }

    // Validate
    if (!amountUSD || !recipientCode && (!bank_code || !account_number || !name)) {
      return RESP(400, {
        ok: false,
        error: "amount, bank_code, account_number are required (or provide recipientCode).",
        hint: "Send JSON with amountUSD (>= 300), and either recipientCode OR bank_code+account_number+name.",
      });
    }
    if (amountUSD < MIN_WITHDRAW_USD) {
      return RESP(400, { ok: false, error: `Minimum withdrawal is $${MIN_WITHDRAW_USD}` });
    }

    // If no recipientCode, create one
    let recipientResp;
    if (!recipientCode) {
      recipientResp = await paystack("/transferrecipient", "POST", {
        type: "nuban",
        name,
        account_number,
        bank_code,
        currency: "NGN",
      });
      recipientCode = recipientResp?.data?.recipient_code || "";
      if (!recipientCode) throw new Error("Failed to obtain recipient_code from Paystack");
    }

    // Convert USD -> kobo
    const amountKobo = usdToKobo(amountUSD);

    // Initiate transfer
    const transferResp = await paystack("/transfer", "POST", {
      source: "balance",
      amount: amountKobo,
      recipient: recipientCode,
      reason,
      reference: reference || undefined,
    });

    return RESP(200, {
      ok: true,
      rateUsed: USD_NGN_RATE,
      amountUSD,
      amountKobo,
      recipientCode,
      paystack: {
        recipient: recipientResp || null,
        transfer: transferResp,
      },
    });
  } catch (e) {
    return RESP(500, { ok: false, error: e.message || String(e), meta: e.raw || null });
  }
};