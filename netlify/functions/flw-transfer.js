// /netlify/functions/flw-transfer.js
import { telegramNotify, emailNotify } from "./_notify.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const payload = JSON.parse(event.body || "{}");
    // Enforce business rules (min $500 etc.) on server too if currency is USD or NGN equivalent
    const min = Number(process.env.MIN_TRANSFER_AMOUNT || "500");
    if (Number(payload.amount) < min) {
      return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ status: "error", message: `Minimum transfer is ${min}` }) };
    }

    // Ensure reference
    if (!payload.reference) payload.reference = `EMP${Date.now()}`;
    if (!payload.currency) payload.currency = "NGN";

    const res = await fetch("https://api.flutterwave.com/v3/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const dataText = await res.text();
    const ok = res.ok;

    // Fire-and-forget notifications
    const brief = ok ? "initiated" : "failed";
    const msg = `Empire payout ${brief}: NGN ${payload.amount} -> ${payload.account_bank}/${payload.account_number}\nRef: ${payload.reference}`;
    try { await telegramNotify(msg); } catch {}
    try { await emailNotify(`Empire payout ${brief}`, msg); } catch {}

    return {
      statusCode: res.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: dataText,
    };
  } catch (e) {
    try { await telegramNotify(`Empire payout error: ${e.message}`); } catch {}
    try { await emailNotify("Empire payout error", e.message); } catch {}
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ status: "error", message: e.message }) };
  }
}
