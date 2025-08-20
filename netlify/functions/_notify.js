"use strict";

const axios = require("axios");
const nodemailer = require("nodemailer");

async function notifyTelegram(text) {
  try {
    const BOT = process.env.TELEGRAM_BOT_TOKEN || "";
    const CHAT = process.env.TELEGRAM_CHAT_VALUE || process.env.TELEGRAM_CHAT_ID || "";
    if (!BOT || !CHAT) return { ok: false, error: "Telegram env not set" };
    const url = `https://api.telegram.org/bot${BOT}/sendMessage`;
    const res = await axios.post(url, { chat_id: CHAT, text, disable_web_page_preview: true }, { timeout: 10000 });
    return { ok: true, result: res.data };
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data ? JSON.stringify(err.response.data) : String(err);
    return { ok: false, status, error: body };
  }
}

async function notifyEmail({ to, subject, text, html }) {
  try {
    const host = process.env.SMTP_HOST || "";
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || "false") === "true";
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || "";
    if (!host || !user || !pass || !from) return { ok: false, error: "SMTP env not set" };
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    const info = await transporter.sendMail({ from, to, subject, text, html });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

async function notifyWhatsApp(toE164, body) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID || "";
    const token = process.env.TWILIO_AUTH_TOKEN || "";
    const fromVal = process.env.TWILIO_WHATSAPP_FROM || "";
    if (!sid || !token || !fromVal) return { ok: false, error: "Twilio env not set" };
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const p = new URLSearchParams();
    p.append("From", `whatsapp:${fromVal}`);
    p.append("To", `whatsapp:${toE164}`);
    p.append("Body", body);
    const res = await axios.post(url, p, {
      auth: { username: sid, password: token },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000
    });
    return { ok: true, sid: res.data.sid };
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data ? JSON.stringify(err.response.data) : String(err);
    return { ok: false, status, error: body };
  }
}

module.exports = { notifyTelegram, notifyEmail, notifyWhatsApp };
