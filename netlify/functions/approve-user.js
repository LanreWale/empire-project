// netlify/functions/approve-user.js
"use strict";

const { notifyWhatsApp, notifyTelegram, toE164 } = require("./_notify");
const axios = require("axios");

// tiny helpers
const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const { name = "", email = "", phone = "", approve = false, tier = "1x" } = safeJSON(event.body);

    // normalize phone to E.164 (e.g., +234...)
    const e164 = toE164(phone);
    const results = {};

    // 1) Notify user (WhatsApp) if approving
    if (approve && e164) {
      const msg =
        `✅ *Empire Approval*\n\n` +
        `Hello ${name || "there"}, your account has been *approved*.\n` +
        `Tier: ${tier}\n` +
        `Login: https://empireaffiliatemarketinghub.com\n\n` +
        `Welcome aboard — let’s win!`;

      results.whatsapp = await notifyWhatsApp(e164, msg);
    } else {
      results.whatsapp = { ok: false, error: "Invalid phone number or not approved" };
    }

    // 2) Telegram ops note (channel)
    try {
      const text = approve
        ? `🟢 APPROVED: ${name || email || e164} (tier ${tier})`
        : `🟡 REVIEWED: ${name || email || e164} (not approved)`;
      results.telegram = await notifyTelegram(text);
    } catch (e) {
      results.telegram = {
        ok: false,
        status: e.response?.status,
        error: typeof e.response?.data === "string" ? e.response.data : JSON.stringify(e.response?.data || e.message),
      };
    }

    // 3) Log to Sheets (Event_Log) and try to mark status in Onboarding (best-effort)
    try {
      const siteOrigin =
        process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
      if (siteOrigin) {
        const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;

        // 3a) append to Event_Log
        await axios.post(
          gsBridge,
          {
            action: "append",
            sheet: "Event_Log",
            values: [
              new Date().toISOString(),
              "Approval",
              name || email || e164,
              approve ? `Approved (${tier})` : "Reviewed (not approved)",
            ],
          },
          { timeout: 10000 }
        ).catch(() => {});

        // 3b) try to update Onboarding status (your Apps Script can handle this custom action)
        // If the Apps Script doesn't recognize this action, it will just no-op.
        await axios.post(
          gsBridge,
          {
            action: "update_status",
            sheet: "Onboarding",
            // Use email as the primary key; falls back to phone if needed
            lookup: email || e164 || name,
            // fields for Apps Script to set:
            updates: { Status: approve ? "Approved" : "Pending", Tier: tier },
          },
          { timeout: 10000 }
        ).catch(() => {});
      }
    } catch {
      // swallow sheet errors to avoid blocking user notifications
    }

    return json(200, { phone: e164 || phone, name, email, results });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};