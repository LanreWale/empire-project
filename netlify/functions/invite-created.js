// netlify/functions/invite-created.js
"use strict";

const axios = require("axios");

// ---------- helpers ----------
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const nowISO = () => new Date().toISOString();

async function notifyTelegram({ text }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_VALUE || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, skipped: true, reason: "no_telegram_env" };

  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return { ok: true, result: res.data };
  } catch (e) {
    return { ok: false, status: e?.response?.status, error: JSON.stringify(e?.response?.data || String(e)) };
  }
}

async function notifyWhatsApp({ text, to }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from || !to) return { ok: false, skipped: true, reason: "no_whatsapp_env_or_to" };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${from}`,
    Body: text,
  });

  try {
    const res = await axios.post(url, body, {
      auth: { username: sid, password: token },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return { ok: true, sid: res?.data?.sid };
  } catch (e) {
    return { ok: false, status: e?.response?.status, error: JSON.stringify(e?.response?.data || String(e)) };
  }
}

async function appendToSheet({ sheet, values }) {
  const appUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;
  if (!appUrl) return { ok: false, error: "GOOGLE_SHEETS_WEBAPP_URL not set" };

  try {
    const res = await axios.post(appUrl, {
      action: "append",
      sheet,
      values,
    });
    return res.data; // { ok: true, sheet, appended: N } from your Apps Script
  } catch (e) {
    return { ok: false, status: e?.response?.status, error: JSON.stringify(e?.response?.data || String(e)) };
  }
}

// ---------- main handler ----------
module.exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(200, { ok: true, baseConfigured: true });
  }

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch {}

  const name = (payload.name || "").trim();
  const email = (payload.email || "").trim();
  const phone = (payload.phone || "").trim();

  // Build the notification text
  const ts = nowISO();
  const lines = [
    "📝 <b>New Registration</b>",
    `• <b>Name:</b> ${name || "—"}`,
    `• <b>Email:</b> ${email || "—"}`,
    `• <b>Phone:</b> ${phone || "—"}`,
    `• <b>Time (UTC):</b> ${ts}`,
  ];
  const text = lines.join("\n");

  // 1) Send Telegram
  const tg = await notifyTelegram({ text });

  // 2) Send WhatsApp (only if phone provided)
  const wa = phone ? await notifyWhatsApp({ text, to: phone }) : { ok: false, skipped: true, reason: "no_phone" };

  // 3) Append to Sheets
  // Onboarding row: [timestamp, name, email, phone, source, status]
  const onboarding = await appendToSheet({
    sheet: "Onboarding",
    values: [ts, name, email, phone, "invite-created", "Pending"],
  });

  // Event log row: [timestamp, actor, message]
  const eventLog = await appendToSheet({
    sheet: "Event_Log",
    values: [ts, "Empire System", `invite-created → ${name || email || phone || "unknown"}`],
  });

  return json(200, {
    ok: true,
    notified: { telegram: tg, whatsapp: wa },
    sheets: { onboarding, eventLog },
  });
};