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

    // Optional header gate
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser =
      event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const body = safeJSON(event.body);
    const name = body.name || "";
    const userEmail = body.email || "";
    const phone = body.phone || "";
    const telegramHandle = body.telegramHandle || "";

    const BASE = process.env.INVITES_BASE_URL || ""; // e.g. https://join.empireaffiliatemarketinghub.com
    const KEY  = process.env.INVITES_SIGNING_KEY || "";
    const TTLH = parseInt(process.env.INVITE_TTL_HOURS || "48", 10);

    if (!BASE || !KEY) {
      return json(500, { ok: false, error: "Missing INVITES_BASE_URL or INVITES_SIGNING_KEY" });
    }

    // claims & token
    const now = Math.floor(Date.now() / 1000);
    const exp = now + Math.max(1, TTLH) * 3600;
    const claims = { v: 1, iat: now, exp, email: userEmail, phone, tg: telegramHandle, name };

    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const sig = crypto.createHmac("sha256", KEY).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;

    // final invite URL goes to /login with ?i=
    const inviteUrl = `${BASE.replace(/\/$/, "")}/login?i=${encodeURIComponent(token)}`;

    // Best-effort log to Sheets via gs-bridge
    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    if (siteOrigin) {
      const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;
      axios.post(
        gsBridge,
        { action: "append", sheet: "Event_Log", values: [new Date().toISOString(), "System", `Invite for ${userEmail || phone}`, inviteUrl] },
        { timeout: 10000 }
      ).catch(() => {});
    }

    return json(200, { ok: true, inviteUrl, exp, claims: { name, email: userEmail, phone, tg: telegramHandle } });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function safeJSON(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }
function json(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
EOF
