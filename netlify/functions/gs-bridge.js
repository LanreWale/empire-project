"use strict";

const http = require("./lib/http");
const json = (s, b) => ({ statusCode: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(b) });
const safe = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };

exports.handler = async (event) => {
  try {
    const WEBAPP_URL = (process.env.GS_WEBHOOK_URL || process.env.GS_WEBAPP_URL || "").trim();
    const WEBAPP_KEY = (process.env.GS_WEBAPP_KEY || "").trim();
    if (!WEBAPP_URL) return json(500, { ok: false, error: "GS WebApp URL missing" });

    const method = (event.httpMethod || "GET").toUpperCase();

    if (method === "GET") {
      const r = await http.get(WEBAPP_URL, { params: { key: WEBAPP_KEY, action: "read", sheet: "Bridge" }, timeout: 15000 });
      const data = r.data?.data ?? r.data;
      return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
    }

    if (method === "POST") {
      const body = safe(event.body);
      const payload = { key: WEBAPP_KEY, action: "append", sheet: "Bridge", values: body.values || [] };
      const r = await http.post(WEBAPP_URL, payload, { headers: { "Content-Type": "application/json" }, timeout: 15000 });
      return json(200, { ok: true, result: r.data ?? r });
    }

    return json(405, { ok: false, error: "Method not allowed" });
  } catch (e) {
    return json(500, { ok: false, error: String(e && e.message || e) });
  }
};