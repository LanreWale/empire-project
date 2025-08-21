// netlify/functions/revoke-user.js
"use strict";

const axios = require("axios");
const { telegram, whatsapp, email } = require("./lib/notify");

// helpers
const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    // Optional gate: require header if CMD_USER is set
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const { email: userEmail = "", phone = "", reason = "" } = safeJSON(event.body);
    if (!userEmail && !phone) {
      return json(400, { ok: false, error: "Missing email or phone" });
    }

    // Log revocation to Sheets (best-effort)
    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    let sheetAppend = null;
    if (siteOrigin) {
      const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;
      try {
        const r = await axios.post(gsBridge, {
          action: "append",
          sheet: "Event_Log",
          values: [new Date().toISOString(), "Revoke", userEmail || phone, reason || "-"]
        }, { timeout: 10000 });
        sheetAppend = r.data;
      } catch (e) {
        sheetAppend = { ok: false, error: String(e?.response?.data || e.message || e) };
      }
    }

    // Notify ops + user (best-effort)
    const msg =
      `🚫 *Access Revoked*\n` +
      `Email: ${userEmail || "—"}\n` +
      `Phone: ${phone || "—"}\n` +
      (reason ? `Reason: ${reason}\n` : "") +
      `Time: ${new Date().toISOString()}`;

    let tg = null, wa = null, mail = null;
    try { tg = await telegram(msg); } catch { tg = { ok: false }; }
    if (phone) {
      try { wa = await whatsapp(phone, `Your Empire account access has been revoked.${reason ? ` Reason: ${reason}.` : ""}`); }
      catch { wa = { ok: false }; }
    }
    if (userEmail) {
      try { mail = await email({ to: userEmail, subject: "Empire: Access Revoked", text: msg.replace(/\*/g, "") }); }
      catch { mail = { ok: false }; }
    }

    return json(200, { ok: true, sheetAppend, telegram: tg, whatsapp: wa, email: mail });
  } catch (err) {
    // Always return JSON so jq never chokes
    return json(200, { ok: false, error: err.message || String(err) });
  }
};