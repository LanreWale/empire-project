"use strict";

const crypto = require("crypto");
const axios = require("axios");
const { telegram, email, whatsapp } = require("./lib/notify");

const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    const CMD_USER = process.env.CMD_USER || "";
    const hdr = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && hdr !== CMD_USER) return json(401, { ok: false, error: "Unauthorized" });

    const { name = "", email: userEmail = "", phone = "", telegramHandle = "" } = safeJSON(event.body);

    const INVITES_SIGNING_KEY = process.env.INVITES_SIGNING_KEY || "";
    const INVITES_BASE_URL   = process.env.INVITES_BASE_URL   || "";
    if (!INVITES_SIGNING_KEY || !INVITES_BASE_URL) {
      return json(500, { ok: false, error: "Missing INVITES_SIGNING_KEY or INVITES_BASE_URL" });
    }

    const TTL_HOURS = parseInt(process.env.INVITE_TTL_HOURS || "48", 10);
    const now = Math.floor(Date.now() / 1000);
    const exp = now + TTL_HOURS * 3600;

    const claims = { v: 1, iat: now, exp, email: userEmail, phone, tg: telegramHandle, name };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const sig = crypto.createHmac("sha256", INVITES_SIGNING_KEY).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;

    const longUrl  = `${INVITES_BASE_URL.replace(/\/$/, "")}/login?i=${encodeURIComponent(token)}`;
    const origin   = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    const shortUrl = origin ? `${origin.replace(/\/$/, "")}/i/${encodeURIComponent(token)}` : longUrl;

    if (origin) {
      const gsBridge = `${origin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;
      axios.post(
        gsBridge,
        { action: "append", sheet: "Event_Log", values: [new Date().toISOString(), "System", `Invite for ${userEmail || phone}`, shortUrl] },
        { timeout: 10000 }
      ).catch(() => {});
    }

    if (userEmail) {
      email({
        to: userEmail,
        subject: `Your Empire invite (valid ${TTL_HOURS} hours)`,
        text: `Hello ${name || ""},\n\nYour invite (expires in ${TTL_HOURS} hours):\n${shortUrl}\n\n— Empire`,
      }).catch(() => {});
    }
    telegram(`[INVITE] ${userEmail || phone} (${TTL_HOURS}h)\n${shortUrl}`).catch(() => {});
    if (phone) whatsapp(phone, `Empire invite (${TTL_HOURS}h): ${shortUrl}`).catch(() => {});

    return json(200, { ok: true, inviteUrl: shortUrl, exp, claims: { name, email: userEmail, phone, tg: telegramHandle }, inviteUrlLong: longUrl });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};