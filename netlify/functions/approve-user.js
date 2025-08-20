// netlify/functions/approve-user.js
"use strict";

const { notifyTelegram, notifyWhatsApp } = require("./lib/notify");

const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }

    const name = body.name || "";
    const email = body.email || "";
    const phone = body.phone || "";
    const approve = !!body.approve;

    // Compose messages
    const statusWord = approve ? "APPROVED" : "REJECTED";
    const waMsg =
      approve
        ? `✅ Hello ${name}, your Empire account has been approved. You can now access the system.`
        : `⚠️ Hello ${name}, your Empire application was not approved at this time.`;

    const tgMsg =
      `[APPROVAL] ${statusWord}\n` +
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n` +
      `When: ${new Date().toISOString()}`;

    // Fire notifications (best effort)
    const results = {};
    results.telegram = await notifyTelegram(tgMsg);
    results.whatsapp = phone ? await notifyWhatsApp(phone, waMsg) : { ok: false, error: "No phone provided" };

    return json(200, { ok: true, phone, name, email, results });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};