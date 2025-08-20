cat > netlify/functions/invite-create.js <<'EOF'
// netlify/functions/invite-create.js
"use strict";

const crypto = require("crypto");
const axios = require("axios");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    // Optional lightweight header gate
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const { name = "", email: userEmail = "", phone = "", telegramHandle = "" } = safeJSON(event.body);

    const BASE = (process.env.INVITES_BASE_URL || "").replace(/\/$/, "");
    const SIGN_KEY = process.env.INVITES_SIGNING_KEY || "";
    const TTL_HOURS = Number(process.env.INVITE_TTL_HOURS || "48");

    if (!BASE || !SIGN_KEY) {
      return json(500, { ok: false, error: "Missing INVITES_BASE_URL or INVITES_SIGNING_KEY" });
    }

    // Build signed token with expiry
    const now = Math.floor(Date.now() / 1000);
    const exp = now + Math.max(1, TTL_HOURS) * 3600;
    const claims = { v: 1, iat: now, exp, email: userEmail, phone, tg: telegramHandle, name };

    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const sig = crypto.createHmac("sha256", SIGN_KEY).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;

    // Use /login (your transition flow) by design
    const inviteUrl = `${BASE}/login?i=${encodeURIComponent(token)}`;

    // Best-effort log to Sheets through gs-bridge (no secrets in code)
    try {
      const origin = (process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "").replace(/\/$/, "");
      if (origin) {
        await axios.post(
          `${origin}/.netlify/functions/gs-bridge`,
          { action: "append", sheet: "Event_Log", values: [new Date().toISOString(), "System", `Invite for ${userEmail || phone}`, inviteUrl] },
          { timeout: 10000 }
        );
      }
    } catch { /* ignore logging failures */ }

    return json(200, { ok: true, inviteUrl, exp });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function safeJSON(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }
function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
EOF