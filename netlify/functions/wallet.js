// Wallet proxy → pulls rows from your GAS Web App with key.
"use strict";

const ORIGIN = process.env.PUBLIC_SITE_ORIGIN || "*";
const GAS_URL = process.env.GAS_BRIDGE_URL;
const GS_KEY = (process.env.GS_WEBAPP_KEY || "").trim();
const GS_SHEET_ID = (process.env.GS_SHEET_ID || "").trim();

const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};
const respond = (s, b) => ({ statusCode: s, headers: cors, body: JSON.stringify(b) });

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "GET") return respond(405, { ok: false, error: "Method not allowed" });
  if (!GAS_URL || !GS_KEY) return respond(500, { ok: false, error: "Missing GAS_BRIDGE_URL or GS_WEBAPP_KEY" });

  const limit = Math.max(1, Math.min(500, parseInt(event.queryStringParameters?.limit || "50", 10) || 50));

  try {
    // <GAS_URL>?wallet=1&limit=50&key=...&sheetId=...
    const u = new URL(GAS_URL);
    u.searchParams.set("wallet", "1");
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("key", GS_KEY);
    if (GS_SHEET_ID) u.searchParams.set("sheetId", GS_SHEET_ID);

    const r = await fetch(u.toString(), { headers: { "Cache-Control": "no-cache" } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.ok === false) {
      return respond(r.status || 502, { ok: false, error: data?.error || "Upstream error", upstream: data });
    }

    const rawItems = Array.isArray(data?.items) ? data.items
                   : Array.isArray(data?.wallet) ? data.wallet
                   : Array.isArray(data?.rows) ? data.rows
                   : [];

    const items = rawItems.map((x) => {
      const amt = Number(x.amount ?? x.value ?? 0);
      const dir = (x.dir || x.direction || (amt >= 0 ? "in" : "out"));
      return {
        ts: x.ts || x.date || x.timestamp || null,
        amount: Math.abs(amt) || 0,
        method: x.method || x.channel || "",
        status: x.status || "",
        dir: (dir === "in" || dir === "out") ? dir : "in",
      };
    });

    const inflow  = items.filter(i => i.dir === "in").reduce((a,b)=>a+(b.amount||0),0);
    const outflow = items.filter(i => i.dir === "out").reduce((a,b)=>a+(b.amount||0),0);
    const net = inflow - outflow;

    return respond(200, { ok: true, inflow, outflow, net, items });
  } catch (e) {
    return respond(502, { ok: false, error: String(e) });
  }
};