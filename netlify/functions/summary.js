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

const res = (s, b) => ({ statusCode: s, headers: cors, body: JSON.stringify(b) });

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "GET") return res(405, { ok: false, error: "Method not allowed" });
  if (!GAS_URL || !GS_KEY) return res(500, { ok: false, error: "Missing GAS_BRIDGE_URL or GS_WEBAPP_KEY" });

  try {
    // Build <GAS_URL>?action=summary&key=...&sheetId=...
    const u = new URL(GAS_URL);
    u.searchParams.set("action", "summary");
    u.searchParams.set("key", GS_KEY);
    if (GS_SHEET_ID) u.searchParams.set("sheetId", GS_SHEET_ID);

    const r = await fetch(u.toString(), { headers: { "Cache-Control": "no-cache" } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.ok === false) return res(r.status || 502, data || { ok: false });

    return res(200, {
      ok: true,
      totalEarnings: Number(data.totalEarnings || 0),
      activeUsers: Number(data.activeUsers || 0),
      approvalRate: Number(data.approvalRate || 0),
      pendingReviews: Number(data.pendingReviews || 0),
    });
  } catch (e) {
    return res(502, { ok: false, error: String(e) });
  }
};