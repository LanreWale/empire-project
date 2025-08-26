"use strict";

// Small env helper
const val = (k) => {
  const v = process.env[k];
  return v && String(v).trim() !== "" ? String(v).trim() : "";
};

// --- Telegram (no axios; native fetch)
async function notifyTelegram({ text, parse_mode = "HTML", disable_web_page_preview = true }) {
  const BOT  = val("TELEGRAM_BOT_TOKEN");
  const CHAT = val("TELEGRAM_CHAT_ID") || val("TELEGRAM_CHANNEL_USERNAME");
  if (!BOT || !CHAT) return { ok: false, error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID/TELEGRAM_CHANNEL_USERNAME" };

  const chat = CHAT.startsWith("@") || /^-?\d+$/.test(CHAT) ? CHAT : `@${CHAT}`;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode, disable_web_page_preview })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, status: r.status, error: JSON.stringify(data) };
    return { ok: true, data };
  } catch (e) { return { ok: false, error: String(e) }; }
}

// --- WhatsApp (optional gateway; also no axios)
async function notifyWhatsApp({ to, text }) {
  const URL  = val("WA_API_URL");
  const SID  = val("WA_SID");
  const AUTH = val("WA_AUTH");
  const FROM = val("WA_SENDER");
  if (!URL || !SID || !AUTH) return { ok: false, error: "WhatsApp gateway not configured" };

  const form = new URLSearchParams();
  if (FROM) form.set("from", FROM);
  form.set("to", to);
  form.set("text", text);

  try {
    const r = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${SID}:${AUTH}`).toString("base64"),
      },
      body: form
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, status: r.status, error: JSON.stringify(data) };
    return { ok: true, data };
  } catch (e) { return { ok: false, error: String(e) }; }
}

// Email disabled to avoid nodemailer dep
async function notifyEmail() { return { ok: false, error: "Email disabled in this build" }; }

module.exports = { notifyTelegram, notifyWhatsApp, notifyEmail };
// Back-compat alias
if (!module.exports.telegram && module.exports.notifyTelegram) {
  module.exports.telegram = module.exports.notifyTelegram;
}