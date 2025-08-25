// netlify/functions/lib/notify.js
// Lightweight notification helpers used by serverless functions.
// Telegram + (optional) WhatsApp supported. Email intentionally stubbed
// to avoid bundler installing extra dependencies on Netlify.

const axios = require("axios");

// ---- env helpers -----------------------------------------------------------
const reqEnv = (k) => {
  const v = process.env[k];
  if (v && String(v).trim() !== "") return String(v).trim();
  return null;
};

// ---- TELEGRAM --------------------------------------------------------------
// Supports either a numeric chat id or a channel username like "@TheEmpireHq".
async function notifyTelegram({ text, parse_mode = "HTML", disable_web_page_preview = true }) {
  const BOT = reqEnv("TELEGRAM_BOT_TOKEN");
  const CHAT = reqEnv("TELEGRAM_CHAT_ID") || reqEnv("TELEGRAM_CHANNEL_USERNAME"); // allow either
  if (!BOT || !CHAT) {
    return { ok: false, error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID/TELEGRAM_CHANNEL_USERNAME" };
  }

  const url = `https://api.telegram.org/bot${BOT}/sendMessage`;
  try {
    const res = await axios.post(
      url,
      {
        chat_id: CHAT.startsWith("@") || /^-?\d+$/.test(CHAT) ? CHAT : `@${CHAT}`,
        text,
        parse_mode,
        disable_web_page_preview
      },
      { timeout: 15000 }
    );
    return { ok: true, message_id: res.data?.result?.message_id, data: res.data };
  } catch (err) {
    return { ok: false, status: err.response?.status, error: JSON.stringify(err.response?.data || String(err)) };
  }
}

// ---- WHATSAPP (optional) ---------------------------------------------------
// Generic gateway using username/password (e.g., Vonage/Nexmo, Termii, etc.)
// Configure with: WA_API_URL, WA_SID, WA_AUTH, WA_SENDER (or leave unset to skip)
async function notifyWhatsApp({ to, text }) {
  const url = reqEnv("WA_API_URL");
  const sid = reqEnv("WA_SID");
  const auth = reqEnv("WA_AUTH");
  const from = reqEnv("WA_SENDER") || "";

  if (!url || !sid || !auth) {
    return { ok: false, error: "WhatsApp gateway not configured (WA_API_URL/WA_SID/WA_AUTH)" };
  }

  // Most providers accept x-www-form-urlencoded; adjust keys to your gateway.
  const params = new URLSearchParams();
  params.append("from", from);
  params.append("to", to);
  params.append("text", text);

  try {
    const res = await axios.post(url, params, {
      auth: { username: sid, password: auth },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000
    });
    return { ok: true, sid: res.data?.sid, data: res.data };
  } catch (err) {
    return { ok: false, status: err.response?.status, error: JSON.stringify(err.response?.data || String(err)) };
  }
}

// ---- EMAIL (disabled stub) -------------------------------------------------
// Intentionally stubbed so Netlify's bundler doesn't try to resolve nodemailer.
async function notifyEmail(/* { to, subject, text } */) {
  return { ok: false, error: "Email sending disabled in this build" };
}

// ---- exports ---------------------------------------------------------------
module.exports = { notifyTelegram, notifyWhatsApp, notifyEmail };
// Back-compat aliases (some older code may call module.exports.telegram)
if (!module.exports.telegram && module.exports.notifyTelegram) {
  module.exports.telegram = module.exports.notifyTelegram;
}