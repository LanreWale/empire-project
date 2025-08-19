// netlify/functions/invite-create.js
"use strict";

const crypto = require("crypto");
const axios = require("axios");
const { telegram, email, whatsapp } = require("./lib/notify");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    // Optional lightweight auth so randoms can’t mint invites
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) return json(401, { ok: false, error: "Unauthorized" });

    const { name = "", email: userEmail = "", phone = "", telegramHandle = "" } = safeJSON(event.body);

    // reads from env at runtime
    const INVITES_BASE_URL = process.env.INVITES_BASE_URL || "";
    const INVITES_SIGNING_KEY = process.env.INVITES_SIGNING_KEY || "";
    if (!INVITES_BASE_URL || !INVITES_SIGNING_KEY)
      return json(500, { ok: false, error: "Missing INVITES_BASE_URL or INVITES_SIGNING_KEY" });

    // Build claims with 48h expiry
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 48 * 3600;
    const claims = { v: 1, iat: now, exp, email: userEmail, phone, tg: telegramHandle, name };

    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const sig = crypto.createHmac("sha256", INVITES_SIGNING_KEY).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;

    const inviteUrl = `${INVITES_BASE_URL.replace(/\/$/, "")}/login?i=${encodeURIComponent(token)}`;

    // Log to Sheets (best-effort)
    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    if (siteOrigin) {
      const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;
      axios.post(
        gsBridge,
        { action: "append", sheet: "Event_Log", values: [new Date().toISOString(), "System", `Invite for ${userEmail || phone}`, inviteUrl] },
        { timeout: 10000 }
      ).catch(() => {});
    }

    // Notify user/ops (best-effort)
    if (userEmail) {
      email({
        to: userEmail,
        subject: "Your Empire invite (valid 48 hours)",
        text:
          `Hello ${name || ""},\n\n` +
          `Here is your invite link (expires in 48 hours):\n` +
          `${inviteUrl}\n\n— Empire`,
      }).catch(() => {});
    }
    telegram(`[INVITE] ${userEmail || phone} (48h)\n${inviteUrl}`).catch(() => {});
    if (phone) whatsapp(phone, `Empire invite (48h): ${inviteUrl}`).catch(() => {});

    return json(200, { ok: true, inviteUrl, exp });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function safeJSON(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }
function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
