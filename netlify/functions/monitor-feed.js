"use strict";
const env  = (k) => (process.env?.[k] ?? "").toString();
const http = require("./lib/http");

const json = (s, b) => ({
  statusCode: s,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(b),
});
const safe = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };

exports.handler = async (event) => {
  try {
    const WEBAPP_URL = (env("GS_WEBHOOK_URL") || env("GS_WEBAPP_URL") || "").trim();
    const WEBAPP_KEY = (env("GS_WEBAPP_KEY")   || "").trim();
    const SHEET_NAME = (process.env.SHEETS_EVENTS_SHEET || "Log_Event").trim();

    if (!WEBAPP_URL) return json(400, { ok: false, error: "WEBAPP_URL not set" });

    const method = (event.httpMethod || "GET").toUpperCase();

    if (method === "GET") {
      const r = await http.get(WEBAPP_URL, {
        params: { key: WEBAPP_KEY, action: "read", sheet: SHEET_NAME },
        timeout: 15000,
      });
      const raw    = r.data?.data ?? r.data;
      const events = Array.isArray(raw) ? raw : (raw && raw.ts ? [raw] : []);
      return json(200, { ok: true, events });
    }

    if (method === "POST") {
      const b = safe(event.body);
      const rec = {
        ts: new Date().toISOString(),
        type: b.type || "INFO",
        message: b.message || "",
        ref: b.ref || "",
        actor: b.actor || "system",
        meta: b.meta ? JSON.stringify(b.meta) : "",
      };
      const payload = { key: WEBAPP_KEY, action: "append", sheet: SHEET_NAME, values: Object.values(rec) };
      const r = await http.post(WEBAPP_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      });
      return json(200, { ok: true, result: r.data ?? r });
    }

    return json(405, { ok: false, error: "METHOD" });
  } catch (e) {
    return json(500, { ok: false, error: String((e && e.message) || e) });
  }
};
