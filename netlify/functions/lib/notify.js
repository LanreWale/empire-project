// netlify/functions/lib/notify.js
"use strict";

const axios = require("axios");

const env = (k, d = "") => (process.env[k] ?? d);
const ok = (extra = {}) => ({ ok: true, ...extra });
const fail = (msg, extra = {}) => ({ ok: false, error: msg, ...extra });

async function notifyTelegram(text) {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatValue = env("TELEGRAM_CHAT_VALUE");
  const chatId = chatValue || env("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return fail("Telegram not configured");

  try {
    const { data } = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { chat_id: chatId, text, disable_web_page_preview: true },
      { timeout: 10000 }
    );
    return data?.ok ? ok({ result: data.result }) : fail(JSON.stringify(data), { status: data?.error_code || 500 });
  } catch (err) {
    return fail(String(err?.response?.data || err.message || err));
  }
}

async function notifyWhatsApp(to, body) {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  const fromRaw = env("TWILIO_WHATSAPP_FROM"); // e.g. +14155238886
  if (!sid || !token || !fromRaw) return fail("Twilio not configured");
  if (!to || !/^\+\d{8,15}$/.test(to)) return fail("Invalid phone number");

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const From = `whatsapp:${fromRaw}`;
  const To = `whatsapp:${to}`;

  try {
    const { data } = await axios.post(
      url,
      new URLSearchParams({ To, From, Body: body }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: sid, password: token },
        timeout: 15000,
      }
    );
    return ok({ sid: data?.sid });
  } catch (err) {
    const e = err?.response?.data || err.message || err;
    return fail(typeof e === "string" ? e : JSON.stringify(e));
  }
}

module.exports = { notifyTelegram, notifyWhatsApp };