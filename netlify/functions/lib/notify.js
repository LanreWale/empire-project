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

  await transporter.sendMail({ from: SMTP_FROM, to, subject, text, html });
}

// ---------- Telegram ----------
async function telegram(message) {
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID; // set in Netlify UI, not in code
  if (!bot || !chat) return;

  const url = `https://api.telegram.org/bot${bot}/sendMessage`;
  await axios.post(url, { chat_id: chat, text: message }, { timeout: 10000 });
}

// ---------- WhatsApp via Twilio ----------
async function whatsapp(toE164, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from || !toE164) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
  const params = new URLSearchParams();
  params.set("From", `whatsapp:${from}`);
  params.set("To", `whatsapp:${toE164}`);
  params.set("Body", body);

  await axios.post(url, params, {
    timeout: 10000,
    auth: { username: sid, password: token },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

module.exports = { email, telegram, whatsapp };
