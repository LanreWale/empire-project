// netlify/functions/sheets-sync.js
const axios = require("axios");

const ALLOW_ORIGIN = "*"; // you already set global CORS in netlify.toml; this is a safe local fallback

function corsify(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  try {
    // Preflight
    if ((event.httpMethod || "").toUpperCase() === "OPTIONS") {
      return corsify(200, { ok: true });
    }

    const method = (event.httpMethod || "").toUpperCase();

    // ─────────────────────────────────────────────────────────────
    // GET → READ (your current behavior)
    // ─────────────────────────────────────────────────────────────
    if (method === "GET") {
      // Option A: public CSV via Google visualization endpoint
      if (process.env.GOOGLE_SHEETS_PUBLIC === "true" && process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_GID) {
        const url = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&gid=${process.env.GOOGLE_SHEETS_GID}`;
        const resp = await axios.get(url, { timeout: 15000 });
        return corsify(200, { csv: resp.data });
      }

      // Option B: Apps Script Web App passthrough (GET)
      if (process.env.GOOGLE_SHEETS_WEBAPP_URL) {
        const resp = await axios.get(process.env.GOOGLE_SHEETS_WEBAPP_URL, { timeout: 15000 });
        return corsify(200, resp.data);
      }

      return corsify(400, { error: "No Google Sheets configuration set for READ. Set GOOGLE_SHEETS_PUBLIC=true (with ID & GID) or GOOGLE_SHEETS_WEBAPP_URL." });
    }

    // ─────────────────────────────────────────────────────────────
    // POST → APPEND / WRITE
    // payload: { action: "append", values: ["colA","colB",...]}
    // ─────────────────────────────────────────────────────────────
    if (method === "POST") {
      let body = {};
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return corsify(400, { error: "Invalid JSON body." });
      }

      const action = (body.action || "").toLowerCase();

      if (action !== "append") {
        return corsify(400, { error: "Unsupported action. Use { \"action\": \"append\", \"values\": [...] }" });
      }

      // If you’ve set an Apps Script Web App that appends rows, use it directly
      if (process.env.GOOGLE_SHEETS_WEBAPP_URL) {
        try {
          const resp = await axios.post(
            process.env.GOOGLE_SHEETS_WEBAPP_URL,
            { values: body.values },
            { timeout: 20000, headers: { "Content-Type": "application/json" } }
          );
          return corsify(200, { ok: true, via: "apps_script", result: resp.data });
        } catch (err) {
          const data = err.response?.data || { message: err.message };
          return corsify(err.response?.status || 500, { error: "Apps Script append failed", details: data });
        }
      }

      // Otherwise, use Service Account (recommended)
      const {
        GOOGLE_CLIENT_EMAIL,
        GOOGLE_PRIVATE_KEY,
        GOOGLE_SHEETS_ID,
        GOOGLE_SHEETS_RANGE,
      } = process.env;

      if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEETS_ID || !GOOGLE_SHEETS_RANGE) {
        return corsify(400, {
          error: "Missing env vars for Service Account append",
          required: ["GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_SHEETS_ID", "GOOGLE_SHEETS_RANGE"],
        });
      }

      // Lazy import to avoid overhead on GET
      const { google } = require("googleapis");

      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: GOOGLE_CLIENT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          },
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        // Append a single row (array of values)
        const req = await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEETS_ID,
          range: GOOGLE_SHEETS_RANGE, // e.g., "Sheet1!A:D" (next available row is auto-detected)
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [Array.isArray(body.values) ? body.values : [body.values]] },
        });

        return corsify(200, {
          ok: true,
          via: "service_account",
          updates: req.data?.updates || null,
        });
      } catch (err) {
        const status = err.response?.status || 500;
        const details = err.response?.data || { message: err.message };
        return corsify(status, { error: "Service Account append failed", details });
      }
    }

    return corsify(405, { error: "Method not allowed. Use GET or POST." });
  } catch (err) {
    return corsify(500, { error: err.message || "Unexpected error" });
  }
};