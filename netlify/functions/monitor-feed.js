// netlify/functions/monitor-feed.js
"use strict";

const axios = require("./lib/http");

function resp(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}
function safeJson(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }

exports.handler = async (event) => {
  try {
    // ✅ Use ONLY the cleaned envs (no GOOGLE_*). GS_WEBHOOK_URL preferred.
    const WEBAPP_URL = process.env.GS_WEBHOOK_URL || process.env.GS_WEBAPP_URL || "";
    const WEBAPP_KEY = process.env.GS_WEBAPP_KEY || "";

    if (!WEBAPP_URL) return resp(400, { ok: false, error: "WEBAPP_URL not set" });

    const method = (event.httpMethod || "GET").toUpperCase();

    if (method === "GET") {
      // Pull recent events
      const params = {
        key: WEBAPP_KEY,
        action: "read",
        sheet: "Log_Event",
      };
      const r = await axios.get(WEBAPP_URL, { params, timeout: 15000 });

      // Normalize shape: Apps Script may return {ok:true,data:[...]} or raw array
      const data = (r.data && r.data.data) ? r.data.data : r.data;

      // 🔒 Do NOT include any env values (e.g., FALLBACK_USD_RATE) in output
      return resp(200, { ok: true, via: "apps_script", mode: "GET", events: Array.isArray(data) ? data : [] });
    }

    if (method === "POST") {
      // Append a single event
      const body = safeJson(event.body);
      const ts = new Date().toISOString();

      const record = {
        ts,
        type: body.type || "INFO",
        message: body.message || "",
        ref: body.ref || "",
        actor: body.actor || "system",
        meta: body.meta ? JSON.stringify(body.meta) : "",
      };

      const payload = {
        key: WEBAPP_KEY,
        action: "append",
        sheet: "Log_Event",
        values: Object.values(record),
      };

      const r = await axios.post(WEBAPP_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      });

      // 🔒 No secrets in output
      return resp(200, { ok: true, via: "apps_script", mode: "POST", result: r.data });
    }

    return resp(405, { ok: false, error: "METHOD" });
  } catch (err) {
    return resp(500, { ok: false, error: String(err) });
  }
};