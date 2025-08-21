# overwrite the file completely
cat > netlify/functions/lib/notify.js <<'EOF'
// netlify/functions/lib/notify.js
"use strict";

const axios = require("axios");
const nodemailer = require("nodemailer");

const env = (k, d = "") => (process.env[k] ?? d);

// -------- Telegram --------
async function notifyTelegram(text, { parseMode = "HTML" } = {}) {
  try {
    const token = env("TELEGRAM_BOT_TOKEN");
    const chat = env("TELEGRAM_CHAT_VALUE") || env("TELEGRAM_CHAT_ID");
    if (!token || !chat) return { ok: false, skipped: true, reason: "Telegram env not set" };

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await axios.post(
      url,
      { chat_id: chat, text, parse_mode: parseMode, disable_web_page_preview: true },
      { timeout: 10000 }
    );
    return { ok: true, result: res.data?.result || res.data };
  } catch (err) {
    return { ok: false, status: err.response?.status, error: safeErr(err) };
  }
}

// -------- Email (SMTP) --------
async function notifyEmail({ to, subject, text, html }) {
  try {
    const host = env("SMTP_HOST");
    const port = Number(env("SMTP_PORT") || 587);
    const secure = String(env("SMTP_SECURE") || "false") === "true";
    const user = env("SMTP_USER");
    const pass = env("SMTP_PASS");
    const from = env("SMTP_FROM") || user;

    if (!host || !user || !pass) return { ok: false, skipped: true, reason: "SMTP env not set" };

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    const info = await transporter.sendMail({ from, to, subject, text, html });
    return { ok: true, id: info.messageId };
  } catch (err) {
    return { ok: false, error: safeErr(err) };
  }
}

// -------- WhatsApp (Twilio) --------
async function notifyWhatsApp(toE164, message) {
  try {
    const sid = env("TWILIO_ACCOUNT_SID");
    const token = env("TWILIO_AUTH_TOKEN");
    const from = env("TWILIO_WHATSAPP_FROM"); // DO NOT hard-code; read from env only

    if (!sid || !token || !from) {
      return { ok: false, skipped: true, reason: "Twilio env not set" };
    }

    // Twilio requires "whatsapp:" prefix
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const res = await axios.post(
      url,
      new URLSearchParams({
        From: `whatsapp:${from}`,
        To: `whatsapp:${toE164}`,
        Body: message,
      }),
      {
        auth: { username: sid, password: token },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      }
    );

    return { ok: true, sid: res.data?.sid };
  } catch (err) {
    return { ok: false, status: err.response?.status, error: safeErr(err) };
  }
}

function safeErr(err) {
  if (!err) return "Unknown error";
  if (err.response?.data) {
    try { return JSON.stringify(err.response.data); } catch {}
    return String(err.response.data);
  }
  return err.message || String(err);
}

module.exports = {
  telegram: notifyTelegram,
  email: notifyEmail,
  whatsapp: notifyWhatsApp,
};
EOF