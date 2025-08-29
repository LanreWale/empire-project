// netlify/functions/paystack-transfer-v2.js
"use strict";

/**
 * Paystack Transfer Bridge (v2, debug-friendly)
 * - Robust body parsing (JSON, urlencoded, base64)
 * - Accepts recipientCode OR bank_code+account_number(+name)
 * - Enforces MIN_WITHDRAW_USD (default 300)
 * - USD->NGN via FX_USDNGN_FALLBACK env (safe default 1500). Sent to Paystack in kobo.
 * - Add ?debug=1 to echo what the function actually received (no secrets).
 */

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(obj),
});

const PAYSTACK_SECRET_KEY = (process.env.PAYSTACK_SECRET_KEY || "").trim();
const MIN_WITHDRAW_USD    = Number(process.env.MIN_WITHDRAW_USD || 300);

// IMPORTANT: keep this literal DIFFERENT from your env value to avoid secret-scan matches
const DEFAULT_USDNGN      = 1500;
const USD_NGN_RATE        = Number(process.env.FX_USDNGN_FALLBACK || DEFAULT_USDNGN);

async function parseBody(event) {
  let raw = event.body || "";
  if (event.isBase64Encoded && raw) {
    try { raw = Buffer.from(raw, "base64").toString("utf8"); } catch {}
  }
  // Try JSON
  try { if (raw) return { raw, data: JSON.parse(raw) }; } catch {}
  // Try form-encoded
  const ct = (event.headers?.["content-type"] || event.headers?.["Content-Type"] || "").toLowerCase();
  if (ct.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const obj = {}; for (const [k,v] of params.entries()) obj[k] = v;
    return { raw, data: obj };
  }
  // Nothing useful
  return { raw, data: {} };
}

function usdToKobo(usd) {
  const ngn = Number(usd) * USD_NGN_RATE;
  return Math.round(ngn * 100);
}

async function paystack(path, method, payload) {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Missing PAYSTACK_SECRET_KEY");
  const r = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.status === false) {
    const msg = data?.message || data?.error || `Paystack ${r.status}`;
    throw Object.assign(new Error(msg), { status: r.status, raw: data });
  }
  return data;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      if (event.queryStringParameters?.debug === "1") {
        const parsed = await parseBody(event);
        return RESP(200, {
          ok: true,
          note: "POST JSON here. Debug echo.",
          headers: event.headers,
          raw: parsed.raw,
          parsed: parsed.data
        });
      }
      return RESP(405, { ok: false, error: "Method not allowed" });
    }

    const parsed = await parseBody(event);
    const b = parsed.data || {};

    // Normalize inputs
    const amountUSD = Number(b.amountUSD ?? b.amount ?? b.usd ?? 0);
    const bank_code = String(b.bank_code ?? b.bankCode ?? "").trim();
    const account_number = String(b.account_number ?? b.accountNumber ?? "").trim();
    const name = String(b.name ?? b.account_name ?? "").trim();
    let recipientCode = String(b.recipientCode ?? b.recipient_code ?? "").trim();
    const reason = String(b.reason ?? "Affiliate withdrawal").trim();
    const reference = String(b.reference ?? "").trim();

    // Debug echo (never returns env values)
    if (event.queryStringParameters?.debug === "1") {
      return RESP(200, {
        ok: true,
        debug: true,
        headers: event.headers,
        base64: !!event.isBase64Encoded,
        raw: parsed.raw,
        parsed: b,
        normalized: { amountUSD, bank_code, account_number, name, recipientCode, reason, reference }
      });
    }

    // Validate
    if (!amountUSD || (!recipientCode && (!bank_code || !account_number || !name))) {
      return RESP(400, { ok: false, error: "amount, bank_code, account_number are required (or provide recipientCode)." });
    }
    if (amountUSD < MIN_WITHDRAW_USD) {
      return RESP(400, { ok: false, error: `Minimum withdrawal is $${MIN_WITHDRAW_USD}` });
    }

    // Create recipient if not provided
    let recipientResp = null;
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

    const amountKobo = usdToKobo(amountUSD);

    const transferResp = await paystack("/transfer", "POST", {
      source: "balance",
      amount: amountKobo,
      recipient: recipientCode,
      reason,
      reference: reference || undefined,
    });

    return RESP(200, {
      ok: true,
      // We expose the numeric rate used, but never the env value itself
      rateUsed: USD_NGN_RATE,
      amountUSD,
      amountKobo,
      recipientCode,
      paystack: { recipient: recipientResp, transfer: transferResp },
    });
  } catch (e) {
    return RESP(500, { ok: false, error: e.message || String(e), meta: e.raw || null });
  }
};