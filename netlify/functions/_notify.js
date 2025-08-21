// netlify/functions/_notify.js
"use strict";

const axios = require("axios");

// Small helpers
const env = (k) => (process.env[k] || "").trim();
const jsonOk = (payload) => ({ ok: true, ...payload });
const jsonErr = (err) => ({ ok: false, error: String(err) });

/**
 * WhatsApp via Twilio
 * Env required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 */
async function notifyWhatsApp({ to, body }) {
  try {
    const SID = env("TWILIO_ACCOUNT_SID");
    const TOKEN = env("TWILIO_AUTH_TOKEN");
    const FROM = env("TWILIO_WHATSAPP_FROM");

    if (!SID || !TOKEN || !FROM) {
      throw new Error("Twilio env not set");
    }
    if (!to) throw new Error("Missing recipient phone");

    const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
    const params = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: `whatsapp:${FROM}`,
      Body: body || "",
    });

    const { data } = await axios.post(url, params, {
      auth: { username: SID, password: TOKEN },
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });

    return jsonOk({ sid: data.sid });
  } catch (e) {
    return jsonErr(e);
  }
}

/**
 * Telegram channel / chat message
 * Env required: TELEGRAM_BOT_TOKEN and (TELEGRAM_CHAT_VALUE or TELEGRAM_CHAT_ID)
 */
async function notifyTelegram({ text }) {
  try {
    const token = env("TELEGRAM_BOT_TOKEN");
    const chatId = env("TELEGRAM_CHAT_VALUE") || env("TELEGRAM_CHAT_ID");
    if (!token || !chatId) throw new Error("Telegram env not set");

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const { data } = await axios.post(
      url,
      { chat_id: chatId, text: text || "", parse_mode: "HTML", disable_web_page_preview: true },
      { headers: { "content-type": "application/json" } }
    );

    return jsonOk({ result: data.result || data });
  } catch (e) {
    return jsonErr(e);
  }
}

/**
 * (Optional) Email skeleton — no-op unless you wire an SMTP sender.
 * Keep exported for parity with earlier code.
 */
async function notifyEmail() {
  return jsonOk({ info: "email sender not configured here" });
}

module.exports = { notifyWhatsApp, notifyTelegram, notifyEmail };