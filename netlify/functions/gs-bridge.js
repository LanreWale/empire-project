const axios = require("axios");

exports.handler = async (event) => {
  try {
    const WEBAPP = process.env.GOOGLE_SHEETS_WEBAPP_URL;
    if (!WEBAPP) {
      return json(500, { ok:false, error:"GOOGLE_SHEETS_WEBAPP_URL not set" });
    }

    // Health check (GET)
    if (event.httpMethod === "GET") {
      const r = await axios.get(WEBAPP, { timeout: 10000 });
      return json(200, r.data);
    }

    // Append via POST
    if (event.httpMethod === "POST") {
      let body = {};
      try { body = JSON.parse(event.body || "{}"); } catch (_) {}

      // Auto-inject the key if not provided
      if (!body.key && process.env.GS_WEBAPP_KEY) {
        body.key = process.env.GS_WEBAPP_KEY;
      }

      // Require action & basics
      if (!body.action) return json(400, { ok:false, error:"action required" });

      // Forward JSON to Apps Script doPost
      const r = await axios.post(WEBAPP, body, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
        maxRedirects: 5
      });
      return json(200, r.data);
    }

    return json(405, { ok:false, error:"Method not allowed" });
  } catch (err) {
    return json(500, { ok:false, error: (err.response && err.response.data) || err.message });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  };
}
