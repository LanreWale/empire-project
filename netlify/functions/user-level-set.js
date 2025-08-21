// netlify/functions/user-level-set.js
"use strict";

const axios = require("axios");
const { telegram, whatsapp } = require("./lib/notify");

// tiny helpers
const json = (s, b) => ({ statusCode: s, headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
const nowISO = () => new Date().toISOString();

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    // lightweight gate: optional CMD_USER header
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) return json(401, { ok: false, error: "Unauthorized" });

    const body = safeJSON(event.body);
    const name  = (body.name  || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const phone = (body.phone || "").trim();
    const level = Number(body.level);
    const reason = (body.reason || "").trim();

    if (!email && !phone) return json(400, { ok: false, error: "Provide email or phone" });
    if (![1,2,3,4,5,10].includes(level)) return json(400, { ok: false, error: "Level must be 1-5 or 10" });

    // Append to Sheets: Users (simple ledger row)
    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    const gsBridge = siteOrigin ? `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge` : null;

    if (gsBridge) {
      // Users sheet columns: Timestamp | Email | Phone | Name | Level | Status | Reason
      await axios.post(gsBridge, {
        action: "append",
        sheet: "Users",
        values: [ nowISO(), email, phone, name, String(level), "LevelSet", reason || "" ]
      }, { timeout: 15000 }).catch(() => {});
      // Event_Log too
      await axios.post(gsBridge, {
        action: "append",
        sheet: "Event_Log",
        values: [ nowISO(), "Commander", `Set level ${level} for ${email||phone}`, reason || "" ]
      }, { timeout: 15000 }).catch(() => {});
    }

    // Notifications (best-effort)
    const msg =
      `✅ *Level Updated*\n` +
      `Name: ${name || "-"}\n` +
      `Email: ${email || "-"}\n` +
      `Phone: ${phone || "-"}\n` +
      `Level: *${level}x*\n` +
      (reason ? `Reason: ${reason}\n` : "") +
      `#Empire`;

    telegram(msg).catch(()=>{});
    if (phone) {
      await whatsapp(phone, `Your Empire level is now *${level}x*. ${reason ? "Note: " + reason : ""}`);
    }

    return json(200, { ok: true, email, phone, level });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function safeJSON(s){ try { return JSON.parse(s||"{}"); } catch { return {}; } }