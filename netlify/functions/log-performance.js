// netlify/functions/log-performance.js
"use strict";

const axios = require("axios");

// small helpers
const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// best-effort Telegram/WhatsApp/Email without crashing if a notifier is missing
function buildNotifiers() {
  try {
    const notify = require("./lib/notify");
    const t = notify.telegram || notify.notifyTelegram;
    const w = notify.whatsapp || notify.notifyWhatsApp;
    const e = notify.email || notify.notifyEmail;
    return { telegram: t, whatsapp: w, email: e };
  } catch (e) {
    return { telegram: null, whatsapp: null, email: null };
  }
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    // Optional gate (only if CMD_USER is set in env)
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const body = safeJSON(event.body);
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const level = String(body.level || "").trim(); // e.g., "1x".."5x"
    const clicks = Number(body.clicks || 0);
    const conversions = Number(body.conversions || 0);
    const revenueUSD = Number(body.revenueUSD || 0);
    const notes = String(body.notes || "").trim();

    if (!email && !phone) {
      return json(400, { ok: false, error: "Missing email or phone" });
    }

    // 1) Append to Google Sheets (Performance_Report) via gs-bridge (best-effort)
    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    let sheetsAppend = null;
    if (siteOrigin) {
      const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;
      try {
        const row = [
          new Date().toISOString(),
          email,
          phone,
          level || "1x",
          clicks,
          conversions,
          revenueUSD,
          notes
        ];
        const r = await axios.post(
          gsBridge,
          { action: "append", sheet: "Performance_Report", values: row },
          { timeout: 15000 }
        );
        sheetsAppend = r.data || null;
      } catch (e) {
        sheetsAppend = { ok: false, error: String(e.message || e) };
      }
    }

    // 2) Notify ops on Telegram (optional)
    const { telegram, whatsapp, email: emailNotify } = buildNotifiers();
    const msg =
      `📈 *Performance Log*\n` +
      `Email: ${email || "—"}\n` +
      `Phone: ${phone || "—"}\n` +
      `Level: ${level || "—"}\n` +
      `Clicks: ${clicks}\n` +
      `Conversions: ${conversions}\n` +
      `Revenue: $${revenueUSD}\n` +
      (notes ? `Notes: ${notes}\n` : ``) +
      `Time: ${new Date().toISOString()}`;

    let tgResult = null;
    if (typeof telegram === "function") {
      try {
        tgResult = await telegram(msg, { parse_mode: "Markdown" });
      } catch (e) {
        tgResult = { ok: false, error: String(e.message || e) };
      }
    }

    // 3) (Optional) WhatsApp confirmation to user
    let waResult = null;
    if (phone && typeof whatsapp === "function") {
      try {
        waResult = await whatsapp(
          phone,
          `Empire: your performance log was received.\nClicks: ${clicks}, Conv: ${conversions}, Rev: $${revenueUSD}.`
        );
      } catch (e) {
        waResult = { ok: false, error: String(e.message || e) };
      }
    }

    // 4) (Optional) Email receipt to user
    let mailResult = null;
    if (email && typeof emailNotify === "function") {
      try {
        mailResult = await emailNotify({
          to: email,
          subject: "Empire Performance Log Receipt",
          text:
            `We received your performance log:\n\n` +
            `Level: ${level || "—"}\n` +
            `Clicks: ${clicks}\n` +
            `Conversions: ${conversions}\n` +
            `Revenue: $${revenueUSD}\n` +
            (notes ? `Notes: ${notes}\n` : ``) +
            `\n— Empire`
        });
      } catch (e) {
        mailResult = { ok: false, error: String(e.message || e) };
      }
    }

    return json(200, {
      ok: true,
      sheetAppend: sheetsAppend,
      telegram: tgResult,
      whatsapp: waResult,
      email: mailResult,
    });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};