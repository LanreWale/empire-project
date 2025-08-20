// netlify/functions/approve-user.js
"use strict";

const axios = require("axios");
const { notifyWhatsApp, notifyTelegram, asJson } = require("./lib/notify"); // existing helper

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const { name = "", email = "", phone = "", approve = true } = safeJSON(event.body);
    const TS = new Date().toISOString();

    // Commander detection (optional)
    const commanderList = (process.env.COMMANDER_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const isCommander = commanderList.includes((email || "").toLowerCase());

    const role = isCommander ? "Commander" : "User";
    const scale = isCommander ? 10 : 1;

    // 1) WhatsApp to user (only on approval)
    let wa = { ok: false };
    if (approve && phone) {
      const text =
        isCommander
          ? `Hi ${name || ""}! Your Empire account is approved.\nRole: Commander (10x). Welcome!`
          : `Hi ${name || ""}! Your Empire account is approved.\nStarting scale: 1x.\nPerform well to earn 5x upgrades.`;
      wa = await notifyWhatsApp(phone, text).catch((e) => ({ ok: false, error: String(e) }));
    }

    // 2) Telegram to ops
    const tgMsg =
      approve
        ? `[APPROVED] ${name || email || phone}\nRole: ${role}\nScale: ${scale}x\nTS: ${TS}`
        : `[REVIEWED] ${name || email || phone}\nStatus: Not approved\nTS: ${TS}`;
    const tg = await notifyTelegram(tgMsg).catch((e) => ({ ok: false, error: String(e) }));

    // 3) Log to Sheets (best-effort)
    await logToSheets({
      sheet: "Event_Log",
      values: [TS, "Approve_User", email || phone || name, role, `${scale}x`, approve ? "approved" : "rejected"],
    }).catch(() => {});

    // Also write a “latest state” marker row to Onboarding (append-only)
    await logToSheets({
      sheet: "Onboarding",
      values: [TS, name, email, phone, role, scale, approve ? "approved" : "rejected"],
    }).catch(() => {});

    return json(200, {
      phone,
      name,
      email,
      role,
      scale,
      results: {
        whatsapp: wa,
        telegram: tg,
      },
    });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function safeJSON(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }
function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function logToSheets({ sheet, values }) {
  // Use your site origin to call the local gs-bridge
  const origin = (process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "").replace(/\/$/, "");
  if (!origin) return;
  const gsBridge = `${origin}/.netlify/functions/gs-bridge`;
  await axios.post(gsBridge, { action: "append", sheet, values }, { timeout: 10000 });
}