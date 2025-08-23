// netlify/functions/gs-bridge.js
const axios = require("./lib/http");

exports.handler = async (event) => {
  try {
    const APP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL; // Apps Script /exec URL
    const KEY = process.env.GS_WEBAPP_KEY;

    if (!APP_URL) {
      return json(500, { ok: false, error: "GOOGLE_SHEETS_WEBAPP_URL not set" });
    }

    if (event.httpMethod === "GET") {
      // simple health/ping passthrough
      const url = new URL(APP_URL);
      url.searchParams.set("action", "ping");
      if (KEY) url.searchParams.set("key", KEY);

      const r = await axios.get(url.toString(), { timeout: 15000, maxRedirects: 5 });
      return json(200, typeof r.data === "string" ? safeParse(r.data) : r.data);
    }

    if (event.httpMethod === "POST") {
      const body = safeParse(event.body || "{}");
      const { action, sheet, values, key } = body;

      const payload = {
        action: action || "append",
        sheet,
        values,
        key: key || KEY,
      };

      // Use form-encoded POST (Apps Script is picky about JSON)
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([k, v]) =>
        params.append(k, typeof v === "string" ? v : JSON.stringify(v))
      );

      const r = await axios.post(APP_URL, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxRedirects: 5,
        timeout: 20000,
      });

      const data = typeof r.data === "string" ? safeParse(r.data) : r.data;
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

function safeParse(s) {
  try { return JSON.parse(s); } catch { return { raw: String(s) }; }
}
