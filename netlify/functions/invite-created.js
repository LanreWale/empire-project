// netlify/functions/invite-create.js
const crypto = require("crypto");
const axios = require("axios");

function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    // ─── Required envs (read only; DO NOT log or embed) ────────────────────────
    const SIGNING_KEY = process.env.INVITE_SIGNING_KEY || "";
    const REG_FORM_URL = process.env.REG_FORM_URL || ""; // e.g. https://enchanting-tiramisu-e8c254.netlify.app
    const INVITE_TTL_HOURS = parseInt(process.env.INVITE_TTL_HOURS || "48", 10);

    if (!SIGNING_KEY) return json(500, { ok: false, error: "INVITE_SIGNING_KEY not set" });
    if (!REG_FORM_URL) return json(500, { ok: false, error: "REG_FORM_URL not set" });

    const body = JSON.parse(event.body || "{}");
    const { name, email, phone } = body;

    if (!email && !phone) {
      return json(400, { ok: false, error: "email or phone is required" });
    }

    // ─── Create signed invite token (HMAC SHA256) ─────────────────────────────
    const now = Math.floor(Date.now() / 1000);
    const exp = now + INVITE_TTL_HOURS * 3600;

    const payload = {
      iat: now,
      exp,
      email: (email || "").trim().toLowerCase(),
      phone: (phone || "").trim(),
      name: (name || "").trim(),
    };

    const header = { alg: "HS256", typ: "JWT" };
    const part1 = b64url(JSON.stringify(header));
    const part2 = b64url(JSON.stringify(payload));
    const toSign = `${part1}.${part2}`;
    const sig = crypto
      .createHmac("sha256", Buffer.from(SIGNING_KEY, "hex").length ? Buffer.from(SIGNING_KEY, "hex") : SIGNING_KEY)
      .update(toSign)
      .digest();
    const token = `${toSign}.${b64url(sig)}`;

    // Invite link (registration page consumes ?invite=)
    const invite_url = `${REG_FORM_URL}?invite=${encodeURIComponent(token)}`;

    // ─── Notify (optional) via existing functions; best-effort no-fail ────────
    const notifyTasks = [];

    // Email (uses your _notify function)
    if (process.env.EMAIL_TO) {
      notifyTasks.push(
        axios
          .post(
            `${process.env.URL || ""}/.netlify/functions/_notify`,
            {
              to: process.env.EMAIL_TO,
              subject: "New Empire Invite Link",
              text: `Invite created for ${name || email || phone}\nExpires in ${INVITE_TTL_HOURS}h\n\n${invite_url}`,
            },
            { timeout: 10000 }
          )
          .catch(() => null)
      );
    }

    // Telegram (uses your test-telegram / notify route if desired)
    if (process.env.TELEGRAM_CHAT_ID && process.env.TELEGRAM_BOT_TOKEN) {
      notifyTasks.push(
        axios
          .post(
            `${process.env.URL || ""}/.netlify/functions/test-telegram`,
            { text: `Invite created: ${name || email || phone}\nExpires in ${INVITE_TTL_HOURS}h\n${invite_url}` },
            { timeout: 10000 }
          )
          .catch(() => null)
      );
    }

    await Promise.allSettled(notifyTasks);

    return json(200, {
      ok: true,
      invite_url,
      expires_at: new Date(exp * 1000).toISOString(),
      ttl_hours: INVITE_TTL_HOURS,
    });
  } catch (err) {
    return json(500, { ok: false, error: err.message || String(err) });
  }
};