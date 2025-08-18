// netlify/functions/gs-append.js
const axios = require("axios");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const { sheet, values } = body;

    const APP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL;
    const KEY = process.env.GS_WEBAPP_KEY;

    if (!APP_URL) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "GOOGLE_SHEETS_WEBAPP_URL not set" }) };
    }
    if (!KEY) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "GS_WEBAPP_KEY not set" }) };
    }
    if (!sheet || !Array.isArray(values)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "sheet and values[] required" }) };
    }

    // Use GET with query params (Apps Script-friendly, avoids 405 on redirects)
    const params = new URLSearchParams();
    params.append("action", "append");
    params.append("key", KEY);
    params.append("sheet", sheet);
    params.append("values", JSON.stringify(values));

    const resp = await axios.get(APP_URL, { params, timeout: 15000 });

    return { statusCode: 200, body: JSON.stringify(resp.data) };
  } catch (err) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: String(err.message || err) }) };
  }
};