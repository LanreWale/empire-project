// netlify/functions/log-performance.js
"use strict";

const axios = require("axios");
const { telegram, email, whatsapp } = require("./lib/notify");

// small helpers
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

    // minimal gate (optional): if CMD_USER is set, require x-cmd-user header to match
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const body = safeJSON(event.body);
    const {
      email: userEmail = "",
      clicks = 0,
      conversions = 0,
      revenueUSD = 0,
      level = "",             // optional snapshot of current level
      notes = "",             // free text
      phone = "",             // optional (to ping via WhatsApp)
      notify = true           // set false to suppress pings
    } = body;

    if (!userEmail) {
      return json(400, { ok: false, error: "Missing email" });
    }

    // Build values row
    const now = new Date().toISOString();
    const values = [now, userEmail, String(clicks), String(conversions), String(revenueUSD), String(level), notes];

    // Append to Performance_Report
    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    if (!siteOrigin) return json(500, { ok: false, error: "Missing site origin at runtime" });

    const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;
    const appendResp = await axios.post(
      gsBridge,
      { action: "append", sheet: "Performance_Report", values },
      { timeout: 10000 }
    ).then(r => r.data).catch(e => ({ ok: false, error: String(e?.response?.data || e.message || e) }));

    // Notifications (best-effort)
    if (notify) {
      const line = `📊 Performance\n• ${userEmail}\n• Clicks: ${clicks} • Conv: ${conversions} • Rev: $${revenueUSD}\n${notes ? `• Notes: ${notes}` : ""}`;
      telegram(line).catch(() => {});
      if (phone && conversions > 0) {
        whatsapp(phone, `Great job! Today: ${conversions} conv • $${revenueUSD} revenue. Keep going.`).catch(() => {});
      }
    }

    return json(200, { ok: true, sheetAppend: appendResp });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};