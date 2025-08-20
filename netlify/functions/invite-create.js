import crypto from "node:crypto";
import nodemailer from "nodemailer";

const env = (k, d = undefined) => process.env[k] ?? d;
const REQUIRED = ["INVITES_SIGNING_KEY", "INVITE_TTL_HOURS", "INVITES_BASE_URL"];

function bad(status, msg) {
  return { statusCode: status, headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: false, error: msg }) };
}

function ok(json) {
  return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify(json, null, 2) };
}

function signInvite(payload, key) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", key).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyTelegramTarget() {
  // prefer numeric ID if provided; else fall back to @username
  return env("TELEGRAM_CHAT_VALUE") || env("TELEGRAM_CHAT_ID");
}

async function sendTelegram(text) {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chat = verifyTelegramTarget();
  if (!token || !chat) return; // silently skip
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => {});
}

async function sendEmail({ to, subject, html }) {
  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT") || 587);
  const secure = String(env("SMTP_SECURE") || "false") === "true";
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  const from = env("SMTP_FROM") || "Empire Hub <no-reply@empireaffiliatemarketinghub.com>";

  if (!host || !user || !pass) return; // skip if SMTP not configured

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  await transporter.sendMail({ from, to, subject, html }).catch(() => {});
}

async function maybeShorten(longUrl) {
  const prefix = env("SHORTENER_PREFIX"); // e.g. https://join.empire...
  if (!prefix) return { shortUrl: null, longUrl };

  // Call our own shortener function if present
  try {
    const res = await fetch(`${env("URL") || ""}/.netlify/functions/shortner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: longUrl }),
    });
    if (!res.ok) throw new Error(`shortner ${res.status}`);
    const data = await res.json();
    return { shortUrl: data.shortUrl || null, longUrl };
  } catch {
    return { shortUrl: null, longUrl };
  }
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return bad(405, "Method Not Allowed");

  // Basic env validation (clear errors early)
  for (const k of REQUIRED) {
    if (!env(k)) return bad(500, `Missing env: ${k}`);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return bad(400, "Invalid JSON");
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const tg = (body.telegramHandle || "").trim();

  if (!name || !email) return bad(400, "name and email are required");

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Number(env("INVITE_TTL_HOURS")) * 3600;

  const claims = { v: 1, iat: now, exp, email, phone, tg, name };
  const token = signInvite(claims, env("INVITES_SIGNING_KEY"));

  // Build long invite URL (send people into the login screen first)
  const base = env("INVITES_BASE_URL").replace(/\/$/, "");
  const longInviteUrl = `${base}/login?i=${token}`;

  const { shortUrl } = await maybeShorten(longInviteUrl);
  const inviteUrl = shortUrl || longInviteUrl;

  // Fire-and-forget notifications
  const brand = "Empire Affiliate Marketing Hub";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px">
      <p>Hello ${name},</p>
      <p>You’ve been invited to join <b>${brand}</b>.</p>
      <p><a href="${inviteUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open your invite</a></p>
      <p style="color:#64748b">This invite expires in ${env("INVITE_TTL_HOURS")} hours.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p>If the button doesn’t work, paste this link into your browser:<br/>
      <a href="${inviteUrl}">${inviteUrl}</a></p>
    </div>
  `;

  // Email (to the invitee)
  await sendEmail({ to: email, subject: "Your Empire invite", html });

  // Telegram (to HQ channel)
  await sendTelegram(
    [
      "🟢 <b>New Invite Created</b>",
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      tg ? `Telegram: ${tg}` : null,
      `Link: ${inviteUrl}`,
      `TTL: ${env("INVITE_TTL_HOURS")}h`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  return ok({ ok: true, inviteUrl, exp, claims: { name, email, phone, tg } });
}