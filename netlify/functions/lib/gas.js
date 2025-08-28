// netlify/functions/lib/gas.js
"use strict";

// Reads your GAS Web App URL + secret key from env, and builds a URL with key + params appended
const GAS_BASE = (process.env.GOOGLE_SHEETS_WEBAPP_URL || process.env.GAS_BRIDGE_URL || process.env.GAS_WEB_APP_URL || "").trim();
const GAS_KEY  = (process.env.GS_WEBAPP_KEY || process.env.APPS_SCRIPT_KEY || "").trim();
const GS_SHEET_ID = (process.env.GS_SHEET_ID || "").trim(); // optional, if your script requires it

if (!GAS_BASE) {
  throw new Error("Missing GOOGLE_SHEETS_WEBAPP_URL (or GAS_BRIDGE_URL/GAS_WEB_APP_URL)");
}

function buildUrl(params = {}) {
  const u = new URL(GAS_BASE);
  // always append key
  if (GAS_KEY) u.searchParams.set("key", GAS_KEY);
  // include sheet id if your script expects it
  if (GS_SHEET_ID && !("sheetId" in params)) u.searchParams.set("sheetId", GS_SHEET_ID);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  });
  return u.toString();
}

async function get(params = {}) {
  const r = await fetch(buildUrl(params), { headers: { "Cache-Control": "no-cache" } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) {
    const err = data?.error || `GAS ${r.status}`;
    return { ok: false, status: r.status, error: err, upstream: data };
  }
  return data;
}

async function post(params = {}) {
  // GAS Web Apps are typically GET-based; keep POST here in case you added doPost handlers.
  const r = await fetch(buildUrl(params), { method: "POST" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) {
    const err = data?.error || `GAS ${r.status}`;
    return { ok: false, status: r.status, error: err, upstream: data };
  }
  return data;
}

module.exports = { get, post, buildUrl };