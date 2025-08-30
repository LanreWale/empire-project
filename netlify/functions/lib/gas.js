// netlify/functions/lib/gas.js
"use strict";

// Prefer the envs you've been using, but accept a few aliases.
const GAS_URL =
  (process.env.GS_WEBHOOK_URL ||
   process.env.GS_WEBAPP_URL ||
   process.env.GAS_BRIDGE_URL ||
   process.env.GOOGLE_SHEETS_WEBAPP_URL ||
   process.env.GAS_WEB_APP_URL ||
   "").trim();

const GAS_KEY =
  (process.env.GS_WEBAPP_KEY ||
   process.env.APPS_SCRIPT_KEY ||
   "").trim();

const GS_SHEET_ID = (process.env.GS_SHEET_ID || "").trim(); // optional

function buildUrl(params = {}) {
  if (!GAS_URL) return ""; // validate later
  const u = new URL(GAS_URL);
  if (GAS_KEY) u.searchParams.set("key", GAS_KEY);
  if (GS_SHEET_ID && !("sheetId" in params)) u.searchParams.set("sheetId", GS_SHEET_ID);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

// tiny fetch helper with timeout
async function xfetch(url, opts = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, ...opts });
    let data = null;
    try { data = await r.json(); } catch { /* non-JSON */ }
    if (!r.ok || (data && data.ok === false)) {
      const err = (data && data.error) || `GAS ${r.status}`;
      return { ok: false, status: r.status, error: err, upstream: data };
    }
    return data ?? { ok: true };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "Timeout" : String(e) };
  } finally {
    clearTimeout(id);
  }
}

async function get(params = {}) {
  if (!GAS_URL) return { ok: false, error: "GS_WEBAPP_URL (or GS_WEBHOOK_URL) not set" };
  return xfetch(buildUrl(params), { headers: { "Cache-Control": "no-cache" } });
}

// POST JSON body; keep key in query string for GAS auth
async function post(payload = {}, params = {}) {
  if (!GAS_URL) return { ok: false, error: "GS_WEBAPP_URL (or GS_WEBHOOK_URL) not set" };
  return xfetch(buildUrl(params), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

module.exports = { get, post, buildUrl };