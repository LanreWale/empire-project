"use strict";

const axios = require("axios");

// --- TELEGRAM ---
async function notifyTelegram(text) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };

  // Prefer numeric chat id when present (channels can be -100...)
  const chatId = (process.env.TELEGRAM_CHAT_VALUE || process.env.TELEGRAM_CHAT_ID || "").trim();
  if (!chatId) return { ok: false, error: "TELEGRAM_CHAT_VALUE/ID not set" };

  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    }, { timeout: 10000 });
    return { ok: true, result: res.data };
  } catch (err) {
    return { ok: false, status: err.response?.status, error: JSON.stringify(err.response?.data || String(err)) };
  }
}

// --- WHATSAPP via Twilio ---
async function notifyWhatsApp(toPhoneE164, message) {
  const sid  = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const auth = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  const from = (process.env.TWILIO_WHATSAPP_FROM || "").trim(); // e.g. "whatsapp:+14155238886"
  if (!sid || !auth || !from) return { ok: false, error: "Twilio env vars not set" };
  if (!toPhoneE164) return { ok: false, error: "Missing recipient phone" };

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const form = new URLSearchParams();
    form.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
    form.set("To", toPhoneE164.startsWith("whatsapp:") ? toPhoneE164 : `whatsapp:${toPhoneE164}`);
    form.set("Body", message);

    const res = await axios.post(url, form, {
      auth: { username: sid, password: auth },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000
    });
    return { ok: true, sid: res.data.sid };
  } catch (err) {
    return { ok: false, status: err.response?.status, error: JSON.stringify(err.response?.data || String(err)) };
  }
}

// --- EMAIL (optional, via SMTP creds if you have nodemailer configured) ---
async function notifyEmail({ to, subject, text }) {
  // Lazy require nodemailer only when needed to keep bundle small
  let nodemailer;
  try { nodemailer = require("nodemailer"); } catch { return { ok: false, error: "nodemailer not installed" }; }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from) return { ok: false, error: "SMTP env not set" };

  try {
    const tx = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    const info = await tx.sendMail({ from, to, subject, text });
    return { ok: true, id: info.messageId };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

module.exports = { notifyTelegram, notifyWhatsApp, notifyEmail };
