const axios = require("axios");

exports.handler = async (event) => {
  try {
    // Simple GET health
    if (event.httpMethod === "GET") {
      const q = event.queryStringParameters || {};
      if (q.debug === "1") {
        return json({
          ok: true,
          via: "debug",
          GOOGLE_SHEETS_WEBAPP_URL: process.env.GOOGLE_SHEETS_WEBAPP_URL || "",
          GS_WEBAPP_KEY_len: (process.env.GS_WEBAPP_KEY || "").length,
          GS_SHEET_ID: process.env.GS_SHEET_ID || "",
          GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || ""
        });
      }
      return json({ ok: true, via: "doGet", ts: new Date().toISOString() });
    }

    // Parse JSON body
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (_) {
      return error(400, "Invalid JSON body");
    }

    const WEBAPP_URL = (process.env.GOOGLE_SHEETS_WEBAPP_URL || "").trim();
    if (!WEBAPP_URL) return error(500, "GOOGLE_SHEETS_WEBAPP_URL not set");

    // Sheet ID: prefer GS_SHEET_ID; fallback GOOGLE_SHEETS_ID
    const SHEET_ID = (process.env.GS_SHEET_ID || process.env.GOOGLE_SHEETS_ID || "").trim();
    if (!SHEET_ID) return error(500, "GS_SHEET_ID not set");

    // Optional key enforcement
    const WANT_KEY = process.env.GS_WEBAPP_KEY;
    if (WANT_KEY && body.key !== WANT_KEY) {
      return error(401, "Invalid or missing key");
    }

    const action = (body.action || "").trim();
    if (!action) return error(400, "Missing action");

    // We will use doGet in the Apps Script (more reliable from server environment)
    const qs = new URLSearchParams();
    qs.set("key", WANT_KEY || "");
    qs.set("sheetId", SHEET_ID);

    if (action === "append") {
      const sheet = (body.sheet || "").trim();
      const values = body.values;
      if (!sheet || !Array.isArray(values)) {
        return error(400, "append requires sheet and values[]");
      }
      qs.set("action", "append");
      qs.set("sheet", sheet);
      qs.set("values", JSON.stringify(values));
    } else if (action === "read") {
      const sheet = (body.sheet || "").trim();
      if (!sheet) return error(400, "read requires sheet");
      qs.set("action", "read");
      qs.set("sheet", sheet);
    } else {
      return error(400, `Unsupported action: ${action}`);
    }

    const url = WEBAPP_URL + (WEBAPP_URL.includes("?") ? "&" : "?") + qs.toString();
    const resp = await axios.get(url, { timeout: 20000 });

    // Pass through Apps Script response (expecting JSON)
    if (typeof resp.data === "object") {
      return json({ ok: true, upstream: resp.data });
    }
    // If it was HTML or text, just surface it
    return json({ ok: true, upstream_raw: String(resp.data).slice(0, 2000) });
  } catch (e) {
    return error(500, e.message);
  }
};

function json(obj) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify(obj),
  };
}

function error(code, msg) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify({ ok: false, error: msg }),
  };
}
