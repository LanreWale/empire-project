// netlify/functions/flw-resolve.js
"use strict";

const axios = require("axios");
const { email } = require("./lib/notify");               // your mail sender
const { payoutInitiated, payoutResult } = require("./lib/templates"); // optional templates

const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };

// Helper: call Flutterwave (example – adjust endpoint/payload to your existing code)
async function flwResolve(payload) {
  const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || "";
  const base = "https://api.flutterwave.com/v3";
  // Example route — replace with your actual resolve endpoint & payload
  const url = `${base}/accounts/resolve`;
  const res = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${FLW_SECRET}` },
    timeout: 10000,
  });
  return res.data;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const body = safeJSON(event.body);
    // Expect whatever your form sends, e.g.:
    // { bank_code, account_number, notifyEmail, amount, ref }
    const {
      bank_code,
      account_number,
      notifyEmail = "",
      amount,
      ref,
    } = body;

    if (!bank_code || !account_number) {
      return json(400, { ok: false, error: "Missing bank_code or account_number" });
    }

    // 1) Call Flutterwave
    const result = await flwResolve({ account_bank: bank_code, account_number });

    // 2) Optional: email “initiated”
    if (notifyEmail) {
      const tpl = payoutInitiated({ amount, ref, name: result?.data?.account_name || "Associate" });
      // NOTE: await is inside the handler -> OK
      await email({
        to: notifyEmail,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      }).catch(() => {});
    }

    // 3) Build response (and optionally send a result email)
    const ok = Boolean(result?.status === "success");
    if (notifyEmail) {
      const tpl2 = payoutResult({
        amount,
        ref,
        status: ok ? "success" : "failed",
        reason: ok ? "" : (result?.message || "Unknown error"),
      });
      await email({
        to: notifyEmail,
        subject: tpl2.subject,
        html: tpl2.html,
        text: tpl2.text,
      }).catch(() => {});
    }

    return json(200, {
      ok,
      via: "flw-resolve",
      raw: result,
    });
  } catch (err) {
    return json(200, { ok: false, error: err?.message || String(err) });
  }
};