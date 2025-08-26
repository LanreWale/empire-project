// netlify/functions/wallet.js
// Wallet proxy → pulls rows from your Google Apps Script Web App.
// Accepts ?limit=50. Zero external deps.

"use strict";

const ORIGIN = process.env.PUBLIC_SITE_ORIGIN || "*";

// 1) Uses env vars if present
// 2) Falls back to your GAS Web App URL (hardcoded below)
const GAS_URL =
  process.env.GAS_BRIDGE_URL ||
  process.env.GAS_WEB_APP_URL ||
  process.env.SHEETS_BRIDGE_URL ||
  "https://script.google.com/macros/s/AKfycbzN5K7h4KRGGuPXsGWo3-nuv28JflmcvrTNjqDSDmGRUrUn3x7s0fGNKc-lP-tZVUgU/exec";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };
}

function respond(status, body) {
  return { statusCode: status, headers: corsHeaders(), body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(), body: "" };
  if (event.httpMethod !== "GET") return respond(405, { ok: false, error: "Method not allowed" });

  const limit = Math.max(1, Math.min(500, parseInt(event.queryStringParameters?.limit || "50", 10) || 50));

  try {
    // Build upstream URL: <GAS_URL>?wallet=1&limit=50
    const u = new URL(GAS_URL);
    u.searchParams.set("wallet", "1");
    u.searchParams.set("limit", String(limit));

    const r = await fetch(u.toString(), { headers: { "Cache-Control": "no-cache" } });
    const data = await r.json().catch(() => ({}));

    if (!r.ok || data?.ok === false) {
      return respond(r.status || 502, { ok: false, error: data?.error || "Upstream error", upstream: data });
    }

    // Accept a few shapes from GAS: items[] | wallet[] | rows[]
    const rawItems = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.wallet)
      ? data.wallet
      : Array.isArray(data?.rows)
      ? data.rows
      : [];

    // Normalize rows
    const items = rawItems.map((x) => {
      const amt = Number(x.amount ?? x.value ?? 0);
      const dir =
        x.dir ||
        x.direction ||
        // If no direction given, infer from sign (>=0 inflow, <0 outflow)
        (amt >= 0 ? "in" : "out");

      return {
        ts: x.ts || x.date || x.timestamp || null,
        amount: Math.abs(amt) || 0,
        method: x.method || x.channel || "",
        status: x.status || "",
        dir: dir === "in" || dir === "out" ? dir : "in",
      };
    });

    // Totals
    const inflow = items.filter((i) => i.dir === "in").reduce((a, b) => a + (b.amount || 0), 0);
    const outflow = items.filter((i) => i.dir === "out").reduce((a, b) => a + (b.amount || 0), 0);
    const net = inflow - outflow;

    return respond(200, { ok: true, inflow, outflow, net, items });
  } catch (e) {
    return respond(502, { ok: false, error: String(e) });
  }
};