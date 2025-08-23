const axios = require("axios");

exports.handler = async (event) => {
  try {
    const WEBAPP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
    const WEBAPP_KEY = process.env.GS_WEBAPP_KEY || "";
    if (!WEBAPP_URL) {
      return resp(400, { ok: false, error: "WEBAPP_URL not set" });
    }

    const method = (event.httpMethod || "GET").toUpperCase();

    if (method === "GET") {
      // Pull recent events
      // Expect Apps Script to return { ok:true, data:[...] } or raw array
      const params = {
        key: WEBAPP_KEY,
        action: "read",
        sheet: "Log_Event",
        // optional: add range/limit if your WebApp supports it
      };
      const r = await axios.get(WEBAPP_URL, { params, timeout: 15000 });

      // Normalize shape
      const data = r.data?.data ?? r.data;
      return resp(200, { ok: true, via: "apps_script", mode: "GET", events: data });
    }

    if (method === "POST") {
      // Append a single event
      // Accepts JSON: { type, message, ref, actor, meta }
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

      // Convert to values array for your WebApp
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

      return resp(200, { ok: true, via: "apps_script", mode: "POST", result: r.data });
    }

    return resp(405, { ok: false, error: "METHOD" });
  } catch (err) {
    return resp(500, { ok: false, error: String(err) });
  }
};

function resp(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
function safeJson(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }