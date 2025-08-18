// netlify/functions/gs-bridge.js
const axios = require("axios");

exports.handler = async (event) => {
  try {
    const APP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL; // your /exec URL
    const KEY = process.env.GS_WEBAPP_KEY;

    if (!APP_URL) {
      return json(500, { ok: false, error: "GOOGLE_SHEETS_WEBAPP_URL not set" });
    }

    if (event.httpMethod === "GET") {
      // passthrough to Apps Script doGet
      const url = new URL(APP_URL);
      url.searchParams.set("action", "ping");
      if (KEY) url.searchParams.set("key", KEY);

      const r = await axios.get(url.toString(), { timeout: 15000 });
      return json(200, r.data);
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { action, sheet, values, key } = body;

      const payload = {
        action: action || "append",
        sheet,
        values,
        key: key || KEY,
      };

      // Use form-encoded POST because Apps Script sometimes 405s application/json
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([k, v]) =>
        params.append(k, typeof v === "string" ? v : JSON.stringify(v))
      );

      const r = await axios.post(APP_URL, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxRedirects: 5,
        timeout: 20000,
      });

      let data = r.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {}
      }
      return json(200, { ok: true, upstream: data });
    }

    return json(405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    const status = err.response?.status || 500;
    const contentType = err.response?.headers?.["content-type"] || "";
    if (contentType.includes("text/html")) {
      const snippet = String(err.response.data).slice(0, 400);
      return json(200, { ok: false, error: `Upstream non-JSON (${status}): ${snippet}` });
    }
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
