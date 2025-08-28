// netlify/functions/lib/util.js
"use strict";

// --- CORS
const ORIGIN = process.env.PUBLIC_SITE_ORIGIN || "*";
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Secret",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };
}
function respond(status, body) {
  return { statusCode: status, headers: corsHeaders(), body: JSON.stringify(body) };
}

// --- GAS url (no hardcoded values -> no secret-scan issues)
function getGasUrl() {
  return (
    (process.env.GAS_BRIDGE_URL || "").trim() ||
    (process.env.GAS_WEB_APP_URL || "").trim() ||
    (process.env.GOOGLE_SHEETS_WEBAPP_URL || "").trim() ||
    (process.env.SHEETS_BRIDGE_URL || "").trim()
  );
}

async function fetchJSON(url, init) {
  const r = await fetch(url, init);
  let data = null;
  try { data = await r.json(); } catch { data = null; }
  return { ok: r.ok, status: r.status, data };
}

async function proxyToGAS(params) {
  const base = getGasUrl();
  if (!base) return respond(500, { ok: false, error: "GAS URL not configured" });
  const u = new URL(base);
  Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  const { ok, status, data } = await fetchJSON(u.toString(), { headers: { "Cache-Control": "no-cache" } });
  if (!ok) return respond(status || 502, { ok: false, error: "Upstream error", upstream: data });
  if (data && data.ok === false) return respond(502, data);
  return respond(200, data ?? { ok: true });
}

module.exports = { corsHeaders, respond, proxyToGAS, getGasUrl };