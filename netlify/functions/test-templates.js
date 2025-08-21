// netlify/functions/test-templates.js
"use strict";

const { payoutInitiated, payoutResult, bankVerify, getAdminRecipients } = require("./lib/templates");
const { email } = require("./lib/notify");

const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") return json(405, { ok:false, error:"Method not allowed" });

    // Sample data to render all templates
    const samples = {
      payoutInitiated: { amount: 125000, ref: "TX-TEST-12345", name: "Associate" },
      payoutResultOK:  { amount: 125000, ref: "TX-TEST-12345", status: "success", reason: "" },
      payoutResultNG:  { amount: 125000, ref: "TX-TEST-12345", status: "failed",  reason: "Insufficient funds" },
      bankVerifyOK:    { bank: "Kuda", account: "1234567890", name: "Associate", ok: true },
      bankVerifyNG:    { bank: "Kuda", account: "1234567890", name: "Associate", ok: false },
    };

    const renders = {
      payoutInitiated: payoutInitiated(samples.payoutInitiated),
      payoutResultOK:  payoutResult(samples.payoutResultOK),
      payoutResultNG:  payoutResult(samples.payoutResultNG),
      bankVerifyOK:    bankVerify(samples.bankVerifyOK),
      bankVerifyNG:    bankVerify(samples.bankVerifyNG),
    };

    // Optional: add ?send=1 to actually send a test email to MAIL_TO/EMAIL_TO
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
    const shouldSend = url.searchParams.get("send") === "1";

    let sent = null;
    if (shouldSend) {
      const to = getAdminRecipients();
      if (!to.length) {
        sent = { ok:false, error:"No recipients in MAIL_TO/EMAIL_TO" };
      } else {
        await email({
          to: to.join(","),
          subject: renders.payoutInitiated.subject,
          html: renders.payoutInitiated.html,
          text: renders.payoutInitiated.text,
        });
        sent = { ok:true, to };
      }
    }

    return json(200, { ok:true, note:"Add ?send=1 to actually send a test mail.", renders, sent });
  } catch (err) {
    return json(200, { ok:false, error: err.message || String(err) });
  }
};
