// netlify/functions/invite-create.js
"use strict";

const crypto = require("crypto");
const axios = require("axios");

// Small helpers
const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    // Optional lightweight auth header (if you set CMD_USER)
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    // Inputs
    const { name = "", email = "", phone = "", telegramHandle = "" } = safeJSON(event.body);

    // Config from env
    const SIGNING_KEY = process.env.INVITES_SIGNING_KEY || "";
    const TTL_HOURS = Number(process.env.INVITE_TTL_HOURS || 48);

    // Choose a base for the invite URL (priority: SHORT_BASE_URL -> SHORTENER_PREFIX -> INVITES_BASE_URL)
    const base =
      (process.env.SHORT_BASE_URL || "").trim() ||
      (process.env.SHORTENER_PREFIX || "").trim() ||
      (process.env.INVITES_BASE_URL || "").trim();

    if (!SIGNING_KEY || !base) {
      return json(500, { ok: false, error: "Missing INVITES_SIGNING_KEY or base URL" });
    }

    // Build signed token (HMAC-SHA256) with expiry
    const now = Math.floor(Date.now() / 1000);
    const exp = now + TTL_HOURS * 3600;
    const claims = { v: 1, iat: now, exp, email, phone, tg: telegramHandle, name };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const sig = crypto.createHmac("sha256", SIGNING_KEY).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;

    // Final invite URL (your join site handles /login?i=...)
    const inviteUrl = `${base.replace(/\/$/, "")}/login?i=${encodeURIComponent(token)}`;

    // Best-effort log to Sheets via your gs-bridge (non-blocking)
    const siteOrigin = (process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "").replace(/\/$/, "");
    if (siteOrigin) {
      const gsBridge = `${siteOrigin}/.netlify/functions/gs-bridge`;
      axios.post(gsBridge, {
        action: "append",
        sheet: "Event_Log",
        values: [new Date().toISOString(), "Invite", email || phone || "(unknown)", inviteUrl]
      }, { timeout: 10000 }).catch(() => {});
    }

    // (Optional) Light notifications — safe, no hard-coded secrets, all read at runtime
    try {
      const { email: sendEmail, telegram, whatsapp } = require("./lib/notify");
      if (email) {
        sendEmail({
          to: email,
          subject: "Your Empire invite (valid for 48 hours)",
          text:
            `Hello ${name || ""},\n\n` +
            `Here is your invite link (expires in ${TTL_HOURS} hours):\n` +
            `${inviteUrl}\n\n— The Empire`,
        }).catch(() => {});
      }
      const tgChannel = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL_USERNAME || "";
      if (tgChannel) {
        telegram(`[INVITE] ${email || phone} (${TTL_HOURS}h)\n${inviteUrl}`).catch(() => {});
      }
      if (phone) {
        whatsapp(phone, `Empire invite (expires in ${TTL_HOURS}h): ${inviteUrl}`).catch(() => {});
      }
    } catch {
      // notify module missing is fine; keep function lean if not configured
    }

    return json(200, { ok: true, inviteUrl, exp, claims: { name, email, phone, tg: telegramHandle } });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};
