// netlify/functions/invite-create.js
"use strict";

const crypto = require("crypto");
const axios = require("axios");
const { telegram, email, whatsapp } = require("./lib/notify");

const json = (c, b) => ({ statusCode: c, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    // Optional guard
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) return json(401, { ok: false, error: "Unauthorized" });

    const { name = "", email: userEmail = "", phone = "", telegramHandle = "" } = safeJSON(event.body);

    // Required config
    const INVITES_SIGNING_KEY = process.env.INVITES_SIGNING_KEY || "";
    if (!INVITES_SIGNING_KEY) return json(500, { ok: false, error: "Missing INVITES_SIGNING_KEY" });

    // TTL and bases (avoid hardcoding real values to keep Netlify secrets scan happy)
    const INVITE_TTL_HOURS = Number(process.env.INVITE_TTL_HOURS || 48);
    const siteOrigin = (process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "").replace(/\/$/, "");
    const REG_FORM_URL = (process.env.REG_FORM_URL || siteOrigin || "").replace(/\/$/, "");
    const SHORT_BASE_URL = (process.env.SHORT_BASE_URL || "").replace(/\/$/, ""); // e.g. https://join.yourdomain.com

    // Build signed token
    const now = Math.floor(Date.now() / 1000);
    const exp = now + INVITE_TTL_HOURS * 3600;
    const claims = { v: 1, iat: now, exp, email: userEmail, phone, tg: telegramHandle, name };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const sig = crypto.createHmac("sha256", INVITES_SIGNING_KEY).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;

    // Short id and KV mint via Edge endpoint
    const shortId = crypto.randomBytes(4).toString("hex"); // 8 chars
    const mintUrl = `${siteOrigin}/_kv/mint`;
    try {
      await axios.post(
        mintUrl,
        { id: shortId, token, ttl: INVITE_TTL_HOURS * 3600 },
        { headers: { "content-type": "application/json", "x-cmd-user": CMD_USER }, timeout: 10000 }
      );
    } catch (_) {
      // continue even if mint fails; longUrl will still work
    }

    const longUrl  = `${REG_FORM_URL}/register?i=${encodeURIComponent(token)}`;
    const shortUrl = SHORT_BASE_URL ? `${SHORT_BASE_URL}/${shortId}` : longUrl; // fallback

    // Log to Sheets (best effort)
    if (siteOrigin) {
      const gsBridge = `${siteOrigin}/.netlify/functions/gs-bridge`;
      axios.post(
        gsBridge,
        { action: "append", sheet: "Event_Log", values: [new Date().toISOString(), "System", `Invite for ${userEmail || phone}`, shortUrl] },
        { timeout: 10000 }
      ).catch(() => {});
    }

    // Notify (best effort)
    if (userEmail) {
      email({
        to: userEmail,
        subject: "Your Empire invite (valid 48 hours)",
        text: `Hello ${name || ""},\n\nHere is your invite link (expires in ${INVITE_TTL_HOURS} hours):\n${shortUrl}\n\n— Empire`,
      }).catch(() => {});
    }
    telegram(`[INVITE] ${userEmail || phone} (${INVITE_TTL_HOURS}h)\n${shortUrl}`).catch(() => {});
    if (phone) whatsapp(phone, `Empire invite (${INVITE_TTL_HOURS}h): ${shortUrl}`).catch(() => {});

    return json(200, { ok: true, shortUrl, longUrl, exp, id: shortId });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};