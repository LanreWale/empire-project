// netlify/functions/log-performance.js
"use strict";

// Notifications
const { telegram, email, whatsapp } = require("./lib/notify");

// helpers
const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: false, raw: text }; }
  return { status: res.status, data };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    // optional gate
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

    // Build values row (InsertSource is appended later when we know which path succeeded)
    const now = new Date().toISOString();
    const baseValues = [now, userEmail, String(clicks), String(conversions), String(revenueUSD), String(level), notes];

    // URLs
    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    const BRIDGE = siteOrigin ? `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge` : "";
    const APPS = (process.env.GOOGLE_SHEETS_WEBAPP_URL || "").trim();

    // Try bridge first
    let sheetAppend = { ok: false, via: "bridge" };
    if (BRIDGE) {
      try {
        const resp = await postJSON(BRIDGE, {
          action: "append",
          sheet: "Performance_Report",
          values: [...baseValues, "bridge"],
        });
        sheetAppend = {
          ok: !!resp?.data?.ok,
          via: "bridge",
          status: resp.status,
          upstream: resp.data,
        };
      } catch (e) {
        sheetAppend = { ok: false, via: "bridge", error: String(e) };
      }
    }

    // Fall back to Apps Script if bridge failed
    let fallback = null;
    if (!sheetAppend.ok && APPS) {
      try {
        const resp = await postJSON(APPS, {
          action: "append",
          sheet: "Performance_Report",
          values: [...baseValues, "apps_script"],
          key: process.env.GS_WEBAPP_KEY || undefined, // harmless if undefined
        });
        fallback = {
          ok: !!resp?.data?.ok,
          via: "apps_script",
          status: resp.status,
          upstream: resp.data,
        };
        if (fallback.ok) sheetAppend = fallback;
      } catch (e) {
        fallback = { ok: false, via: "apps_script", error: String(e) };
      }
    }

    // Notifications (best-effort)
    let tg = null, wa = null, em = null;
    if (notify) {
      const line =
        `📈 *Performance Log*` +
        `\nEmail: ${userEmail}` +
        `\nPhone: ${phone || "—"}` +
        `\nLevel: ${level || "—"}` +
        `\nClicks: ${clicks}` +
        `\nConversions: ${conversions}` +
        `\nRevenue: $${revenueUSD}` +
        (notes ? `\nNotes: ${notes}` : "") +
        `\nTime: ${now}`;
      try { tg = await telegram(line); } catch { tg = { ok: false }; }
      if (phone && Number(conversions) > 0) {
        try { wa = await whatsapp(phone, `Great job! Today: ${conversions} conv • $${revenueUSD}. Keep going.`); }
        catch { wa = { ok: false }; }
      }
      try { em = await email("Empire • Performance Log", line); } catch { em = { ok: false }; }
    }

    return json(200, {
      ok: sheetAppend.ok,
      sheetAppend,
      fallbackTried: !!fallback,
      telegram: tg,
      whatsapp: wa,
      email: em,
    });
  } catch (err) {
    return json(200, { ok: false, error: err?.message || String(err) });
  }
};