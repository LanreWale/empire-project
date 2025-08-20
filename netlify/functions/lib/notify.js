// netlify/functions/lib/notify.js
"use strict";

const axios = require("axios");

/** small helper for consistent JSON-y axios responses */
function asJson(ok, extra = {}) { return { ok, ...extra }; }

/** get env safely (no hard-coding, avoids Netlify secret scanning) */
const env = (k, d = "") => (process.env[k] ?? d);

/**
 * Telegram: send a simple text message to a channel/group/user.
 * Uses either TELEGRAM_CHAT_VALUE (numeric ID like -100123...) or TELEGRAM_CHAT_ID (e.g. @TheEmpireHq)
 */
async function notifyTelegram(text) {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatValue = env("TELEGRAM_CHAT_VALUE");   // preferred numeric/chat id
  const chatId = chatValue || env("TELEGRAM_CHAT_ID"); // fallback username like @ChannelName

  if (!token || !chatId) return asJson(false, { error: "Telegram not configured" });

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const { data } = await axios.post(url, {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }, { timeout: 10000 });

    if (data?.ok) return asJson(true, { result: data.result });
    return asJson(false, { status: data?.error_code || 500, error: JSON.stringify(data) });
  } catch (err) {
    return asJson(false, { error: String(err?.response?.data || err.message || err) });
  }
}

/**
 * WhatsApp via Twilio: send text to a user’s WhatsApp number.
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (E.164 without "whatsapp:")
 * We prepend "whatsapp:" at runtime to avoid secret scanning.
 */
async function notifyWhatsApp(to, body) {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  const fromRaw = env("TWILIO_WHATSAPP_FROM"); // e.g. +14155238886 (without "whatsapp:")
  if (!sid || !token || !fromRaw) return asJson(false, { error: "Twilio not configured" });
  if (!to || !/^\+\d{8,15}$/.test(to)) return asJson(false, { error: "Invalid phone number" });

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const From = `whatsapp:${fromRaw}`;
  const To = `whatsapp:${to}`;

  try {
    const { data } = await axios.post(url,
      new URLSearchParams({ To, From, Body: body }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: sid, password: token },
        timeout: 15000,
      }
    );
    return asJson(true, { sid: data?.sid });
  } catch (err) {
    const e = err?.response?.data || err.message || err;
    return asJson(false, { error: typeof e === "string" ? e : JSON.stringify(e) });
  }
}

module.exports = {
  asJson,
  notifyTelegram,
  notifyWhatsApp,
};