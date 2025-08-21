// netlify/functions/approve-user.js
"use strict";

const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const json = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const env = (k, d="") => (process.env[k] ?? d);

// --- Telegram helper (posts to your channel) ---
async function sendTelegram(text) {
  const bot = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_VALUE"); // -100... for channels
  if (!bot || !chatId) return { ok: false, skipped: "telegram not configured" };

  const url = `https://api.telegram.org/bot${bot}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: !!data.ok, status: res.status, result: data };
}

// --- WhatsApp helper (Twilio API) ---
async function sendWhatsApp(toPhoneE164, body) {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_WHATSAPP_FROM"); // "+1415..." (Twilio sandbox or number)

  if (!sid || !token || !from) return { ok: false, skipped: "twilio not configured" };
  if (!toPhoneE164 || !/^\+[\d]+$/.test(toPhoneE164)) return { ok: false, error: "Invalid phone number" };

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${toPhoneE164}`,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, sid: data.sid, result: data };
}

// --- Google Sheets (Apps Script WebApp) upsert associate ---
async function upsertAssociate({ name, email, phone }) {
  const webapp = env("GOOGLE_SHEETS_WEBAPP_URL");
  if (!webapp) return { ok: false, error: "GOOGLE_SHEETS_WEBAPP_URL not set" };

  const payload = {
    action: "upsertAssociate",
    row: {
      name: String(name || ""),
      email: String(email || ""),
      phone: String(phone || ""),
      status: "Active",
      level: "1x",
      lastActionAt: new Date().toISOString(),
      notes: "Approved via Netlify",
    },
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
    const { name, email, phone, approve } = body;

    // Basic validation
    if (!approve) return json(400, { ok: false, error: "approve=true is required" });
    if (!email && !phone) return json(400, { ok: false, error: "email or phone is required" });

    // 1) WhatsApp to the user
    const waText =
      `Hi ${name || "there"} 👋\n\n` +
      `Your Empire registration has been *approved*. Welcome aboard!\n\n` +
      `Level: 1x\n` +
      `Next steps will follow here and in the Telegram channel.`;

    const wa = await sendWhatsApp(phone, waText);

    // 2) Telegram admin/channel ping
    const tMsg = `✅ Approved: ${name || ""}\nEmail: ${email || "-"}\nPhone: ${phone || "-"}`;
    const tg = await sendTelegram(tMsg);

    // 3) Upsert in Google Sheet (New Associates)
    const gs = await upsertAssociate({ name, email, phone });

    return json(200, {
      ok: true,
      name,
      email,
      phone,
      results: { whatsapp: wa, telegram: tg, sheets: gs },
    });
  } catch (err) {
    return json(500, { ok: false, error: String(err) });
  }
};