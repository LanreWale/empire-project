// netlify/functions/log-performance.js
"use strict";

const axios = require("axios");
const https = require("https");
const { telegram, email, whatsapp } = require("./lib/notify");

// --- helpers ---------------------------------------------------------------
const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// single agent to disable keepAlive (avoids some TLS resets)
const agent = new https.Agent({ keepAlive: false });

async function appendViaBridge(values) {
  const origin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
  if (!origin) throw new Error("Missing site origin");
  const gsBridge = `${origin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;

  const r = await axios.post(
    gsBridge,
    { action: "append", sheet: "Performance_Report", values },
    { timeout: 12000, httpsAgent: agent, headers: { Connection: "close" } }
  );
  return r.data;
}

async function appendDirectToAppsScript(values) {
  const APP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
  const KEY = process.env.GS_WEBAPP_KEY || "";
  if (!APP_URL) throw new Error("GOOGLE_SHEETS_WEBAPP_URL not set");

  // Apps Script prefers form-encoded
  const params = new URLSearchParams();
  params.set("action", "append");
  params.set("sheet", "Performance_Report");
  params.set("values", JSON.stringify(values));
  if (KEY) params.set("key", KEY);

  const r = await axios.post(APP_URL, params, {
    timeout: 12000,
    httpsAgent: agent,
    headers: { "Content-Type": "application/x-www-form-urlencoded", Connection: "close" },
    maxRedirects: 3,
  });

  // Some Apps Scripts return text
  let data = r.data;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch {} }
  return data;
}

async function resilientAppend(values) {
  // 1) try bridge (HTTP/1.1 Connection: close)
  try {
    const d = await appendViaBridge(values);
    if (d && d.ok) return { ok: true, via: "bridge", data: d };
    throw new Error(d?.error || "bridge not ok");
  } catch (e1) {
    // 2) fallback to Apps Script directly
    try {
      const d2 = await appendDirectToAppsScript(values);
      if (d2 && d2.ok) return { ok: true, via: "apps_script", data: d2 };
      return { ok: false, via: "apps_script", error: String(d2?.error || e1?.message || e1) };
    } catch (e2) {
      return { ok: false, via: "apps_script", error: String(e2?.message || e2) };
    }
  }
}

// --- handler ---------------------------------------------------------------
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    // Optional minimal auth
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
      level = "",
      notes = "",
      phone = "",
      notify = true
    } = body;

    if (!userEmail) return json(400, { ok: false, error: "Missing email" });

    const now = new Date().toISOString();
    const values = [now, userEmail, String(clicks), String(conversions), String(revenueUSD), String(level), notes];

    // Append with retry/fallback
    const sheetAppend = await resilientAppend(values);

    // Notifications (best-effort)
    let tg = null, wa = null, mail = null;
    if (notify) {
      const line =
        `📈 *Performance Log*\n` +
        `Email: ${userEmail}\n` +
        `Phone: ${phone || "—"}\n` +
        `Level: ${level || "—"}\n` +
        `Clicks: ${clicks}\n` +
        `Conversions: ${conversions}\n` +
        `Revenue: $${revenueUSD}\n` +
        `Notes: ${notes || "—"}\n` +
        `Time: ${now}`;

      tg = await telegram(line).catch(err => ({ ok: false, error: String(err?.message || err) }));

      if (phone && Number(conversions) > 0) {
        wa = await whatsapp(phone,
          `Empire update:\nConversions: ${conversions}\nRevenue: $${revenueUSD}\nGreat work!`
        ).catch(err => ({ ok: false, error: String(err?.message || err) }));
      }

      mail = await email({
        to: process.env.EMAIL_TO || process.env.SMTP_FROM || "",
        subject: `Performance • ${userEmail} • ${clicks}/${conversions} • $${revenueUSD}`,
        text: line.replace(/\*|_/g, ""),
      }).catch(err => ({ ok: false, error: String(err?.message || err) }));
    }

    return json(200, { ok: true, sheetAppend, telegram: tg, whatsapp: wa, email: mail });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};