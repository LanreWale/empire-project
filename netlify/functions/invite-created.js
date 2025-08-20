// netlify/functions/invite-created.js
"use strict";

const { notifyTelegram, notifyWhatsApp } = require("./_notify");

// Helpers
const safeJSON = (s) => {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
};
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  // Accept both GET (ping) and POST (real submission)
  if (event.httpMethod === "GET") {
    return json(200, { ok: true, baseConfigured: true, via: "GET" });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const data = safeJSON(event.body);
  const name  = (data.name  || "").trim();
  const email = (data.email || "").trim();
  const phone = (data.phone || "").trim();

  if (!name && !email && !phone) {
    return json(400, { ok: false, error: "Missing submission fields" });
  }

  // Build the message shown in Telegram/WhatsApp
  const lines = [
    "📝 *New registration received*",
    name  ? `• *Name:* ${name}`   : null,
    email ? `• *Email:* ${email}` : null,
    phone ? `• *Phone:* ${phone}` : null,
    "",
    "🔔 You can approve instantly from Quick Approvals."
  ].filter(Boolean);

  const message = lines.join("\n");

  // Fire notifications (do not fail the whole request if one channel fails)
  const results = {};

  try {
    results.telegram = await notifyTelegram(message, { parse_mode: "Markdown" });
  } catch (e) {
    results.telegram = { ok: false, error: String(e?.message || e) };
  }

  if (phone) {
    try {
      results.whatsapp = await notifyWhatsApp(phone, message);
    } catch (e) {
      results.whatsapp = { ok: false, error: String(e?.message || e) };
    }
  }

  return json(200, {
    ok: true,
    notified: true,
    results,
  });
};