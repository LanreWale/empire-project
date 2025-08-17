// netlify/functions/sheets-sync.js
// READ: CSV from public sheet (GET)
// WRITE: Append via Apps Script Web App (POST action=append)
// Secured with GS_WEBAPP_KEY shared secret

const axios = require("axios");

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function reply(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  try {
    const method = (event.httpMethod || "").toUpperCase();

    // Preflight
    if (method === "OPTIONS") return reply(200, { ok: true });

    // ─────────────────────────────────────────────────────────────
    // GET → READ CSV (public view) or passthrough to Apps Script
    // ─────────────────────────────────────────────────────────────
    if (method === "GET") {
      if (process.env.GOOGLE_SHEETS_PUBLIC === "true" &&
          process.env.GOOGLE_SHEETS_ID) {
        const gid =
          (event.queryStringParameters && event.queryStringParameters.gid) ||
          process.env.GOOGLE_SHEETS_GID ||
          "0";
        const url = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        return reply(200, { csv: data });
      }

      if (process.env.GOOGLE_SHEETS_WEBAPP_URL) {
        const { data } = await axios.get(process.env.GOOGLE_SHEETS_WEBAPP_URL, { timeout: 15000 });
        return reply(200, data);
      }

      return reply(400, { error: "No Google Sheets configuration set (READ). Set GOOGLE_SHEETS_PUBLIC=true + ID(+GID) or GOOGLE_SHEETS_WEBAPP_URL." });
    }

    // ─────────────────────────────────────────────────────────────
    // POST → APPEND / WRITE via Apps Script Web App
    // payload: { action:"append", sheet:"TabName", values:[...]}  OR
    //          { action:"append", sheet:"TabName", record:{...mapped} }
    // ─────────────────────────────────────────────────────────────
    if (method === "POST") {
      if (!process.env.GOOGLE_SHEETS_WEBAPP_URL) {
        return reply(400, { error: "Apps Script Web App URL not configured (GOOGLE_SHEETS_WEBAPP_URL)" });
      }
      if (!process.env.GS_WEBAPP_KEY) {
        return reply(400, { error: "Missing GS_WEBAPP_KEY in environment" });
      }

      let body = {};
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return reply(400, { error: "Invalid JSON body" });
      }

      const action = (body.action || "").toLowerCase();
      const sheet = body.sheet;
      if (action !== "append") {
        return reply(400, { error: "Unsupported action. Use action:\"append\"" });
      }
      if (!sheet) {
        return reply(400, { error: "Missing 'sheet' (target tab name)" });
      }

      // Map record -> ordered row when needed
      let row = body.values;
      if (!Array.isArray(row) && body.record) {
        const r = body.record;
        switch (sheet) {
          case "Onboarding":
            // Name, Email, Phone No, Telegram, Status
            row = [r.name || "", r.email || "", r.phone || "", r.telegram || "", r.status || "Pending"];
            break;
          case "Log_Event":
            // Timestamp, User, Action
            row = [r.timestamp || new Date().toISOString(), r.user || "system", r.action || ""];
            break;
          case "Performance_Report":
            // Date/Time, Country, Offer Type, Device, Clicks, Leads, Earnings
            row = [
              r.datetime || new Date().toISOString(),
              r.country || "",
              r.offerType || "",
              r.device || "",
              r.clicks || "",
              r.leads || "",
              r.earnings || ""
            ];
            break;
          case "New Associates":
            // Full Name, Email, Phone, Telegram Handle, Bank Name, Bank Account No, Sort Code, Meta
            row = [
              r.fullName || "",
              r.email || "",
              r.phone || "",
              r.telegram || "",
              r.bankName || "",
              r.bankAccount || "",
              r.sortCode || "",
              r.meta || ""
            ];
            break;
          default:
            // Fallback: just take values in object order
            row = Object.values(r);
        }
      }

      if (!Array.isArray(row)) {
        return reply(400, { error: "Provide values[] or a mappable record{}" });
      }

      // Send to Apps Script Web App with shared key
      const payload = {
        key: process.env.GS_WEBAPP_KEY, // 🔐 shared secret
        action: "append",
        sheet,
        values: row,
      };

      try {
        const { data } = await axios.post(process.env.GOOGLE_SHEETS_WEBAPP_URL, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        });
        return reply(200, { ok: true, via: "apps_script", result: data });
      } catch (err) {
        const status = err.response?.status || 500;
        const details = err.response?.data || { message: err.message };
        return reply(status, { error: "Apps Script append failed", details });
      }
    }

    return reply(405, { error: "Method not allowed. Use GET or POST." });
  } catch (err) {
    return reply(500, { error: err.message || "Unexpected error" });
  }
};