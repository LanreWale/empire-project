// netlify/functions/lib/notify.js
"use strict";

const nodemailer = require("nodemailer");
const axios = require("axios");

// ---------- Email (SMTP) ----------
async function email({ to, subject, text, html }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || "").toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}

// ---------- Telegram ----------
async function telegram(message) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message }, { timeout: 10000 });
}

// ---------- WhatsApp via Twilio (optional) ----------
async function whatsapp(toE164, body) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !toE164) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`;
  const params = new URLSearchParams();
  params.set("From", `whatsapp:${TWILIO_WHATSAPP_FROM}`);
  params.set("To", `whatsapp:${toE164}`);
  params.set("Body", body);

  await axios.post(url, params, {
    timeout: 10000,
    auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

module.exports = { email, telegram, whatsapp };