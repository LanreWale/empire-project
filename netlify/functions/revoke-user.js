// netlify/functions/revoke-user.js
"use strict";

const axios = require("./lib/http");
const { telegram, email, whatsapp } = require("./lib/notify");

// helpers
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

    // optional admin gate
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const body = safeJSON(event.body);
    const {
      email: userEmail = "",
      phone = "",                  // if present, we can WhatsApp the user
      name = "",                   // optional; for human-friendly messages
      reason = "account revoked",  // free text
      notify = true                // set false to suppress outbound notifications
    } = body;

    if (!userEmail) {
      return json(400, { ok: false, error: "Missing email" });
    }

    // Compose a single-line descriptor for logs/alerts
    const line =
      `🚫 Revoke\n• ${userEmail}${name ? " (" + name + ")" : ""}\n` +
      `${phone ? "• " + phone + "\n" : ""}` +
      `• Reason: ${reason}`;

    // Best-effort: log to Sheets via gs-bridge
    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    let sheetLog = null;
    if (siteOrigin) {
      const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;
      try {
        sheetLog = await axios.post(
          gsBridge,
          {
            action: "append",
            sheet: "Event_Log",
            values: [new Date().toISOString(), "Revoke", userEmail, reason]
          },
          { timeout: 10000 }
        ).then(r => r.data);
      } catch (e) {
        sheetLog = { ok: false, error: String(e?.response?.data || e.message || e) };
      }
    }

    // Notifications (best-effort)
    let tg = null, wa = null, em = null;
    if (notify) {
      try { tg = await telegram(line); } catch { tg = { ok: false }; }
      if (phone) {
        try { wa = await whatsapp(phone, `Your Empire account has been revoked. Reason: ${reason}`); } catch { wa = { ok: false }; }
      }
      // email the user (if you want to email ops instead, change "to")
      if (userEmail) {
        try {
          em = await email({
            to: userEmail,
            subject: "Empire account status: Revoked",
            text:
              `Hello${name ? " " + name : ""},\n\n` +
              `Your Empire account has been revoked.\n` +
              `Reason: ${reason}\n\n` +
              `If you believe this is a mistake, reply to this email.\n\n— Empire`
          });
        } catch { em = { ok: false }; }
      }
    }

    return json(200, {
      ok: true,
      email: userEmail,
      reason,
      sheetLog,
      telegram: tg,
      whatsapp: wa,
      emailResult: em
    });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};
