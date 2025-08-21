// netlify/functions/user-level-set.js
"use strict";

const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const json = (s, b) => ({ statusCode: s, headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
const env = (k, d = "") => (process.env[k] ?? d);

async function sendTelegram(text) {
  const bot = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_VALUE");
  if (!bot || !chatId) return { ok: false, skipped: "telegram not configured" };
  const url = `https://api.telegram.org/bot${bot}/sendMessage`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: !!data.ok, status: r.status, result: data };
}

async function setLevelOnSheets({ email, phone, newLevel, notes }) {
  const webapp = env("GOOGLE_SHEETS_WEBAPP_URL");
  if (!webapp) return { ok: false, error: "GOOGLE_SHEETS_WEBAPP_URL not set" };

  const payload = {
    action: "setLevel",
    email: String(email || ""),
    phone: String(phone || ""),
    level: String(newLevel || ""),
    notes: String(notes || ""),
    at: new Date().toISOString(),
  };

  const res = await fetch(webapp, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: data?.ok === true, upstream: data };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "POST only" });

    const body = JSON.parse(event.body || "{}");
    const { email, phone, level, notes } = body;

    if (!email && !phone) return json(400, { ok: false, error: "email or phone is required" });
    if (!level) return json(400, { ok: false, error: "level is required (e.g. 1x..5x or 10x)" });

    const gs = await setLevelOnSheets({ email, phone, newLevel: level, notes });

    // Telegram audit trail
    const who = email || phone;
    const t = await sendTelegram(`🔧 Level change: ${who}\n➡️ ${level}${notes ? `\n📝 ${notes}` : ""}`);

    return json(200, { ok: true, results: { sheets: gs, telegram: t } });
  } catch (err) {
    return json(500, { ok: false, error: String(err) });
  }
};