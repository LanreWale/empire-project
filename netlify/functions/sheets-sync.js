// /netlify/functions/sheets-sync.js
import { google } from "googleapis";

export async function handler() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    const range = process.env.GOOGLE_SHEETS_RANGE || "Onboarding!A2:F";
    const publicFlag = (process.env.GOOGLE_SHEETS_PUBLIC || "").toLowerCase() === "true";

    let users = [];

    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      // Preferred: service account
      const auth = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY).private_key,
        ["https://www.googleapis.com/auth/spreadsheets.readonly"]
      );
      const sheets = google.sheets({ version: "v4", auth });
      const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      const rows = data.values || [];
      users = rows.map(r => ({
        timestamp: r[0] || "",
        name: r[1] || "",
        email: r[2] || "",
        phone: r[3] || "",
        kyc: r[4] || "",
        status: r[5] || "",
      }));
    } else if (publicFlag) {
      // Public CSV export fallback
      // Assumes the sheet is published to the web or shared "Anyone with the link"
      const gid = process.env.GOOGLE_SHEETS_GID || "";
      const csvUrl = gid
        ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
        : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(range.split("!")[0])}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`Public CSV fetch failed: ${res.status}`);
      const text = await res.text();
      users = text.trim().split("\n").map(line => {
        const cols = line.split(",");
        return {
          timestamp: cols[0] || "",
          name: cols[1] || "",
          email: cols[2] || "",
          phone: cols[3] || "",
          kyc: cols[4] || "",
          status: cols[5] || ""
        };
      });
    } else if (process.env.GOOGLE_SHEETS_WEBAPP_URL) {
      // Apps Script web app that returns JSON { users: [...] }
      const res = await fetch(process.env.GOOGLE_SHEETS_WEBAPP_URL);
      const data = await res.json();
      users = data.users || [];
    } else {
      throw new Error("No Google Sheets credentials provided. Set service account envs OR GOOGLE_SHEETS_PUBLIC=true OR GOOGLE_SHEETS_WEBAPP_URL.");
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ users }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: e.message }),
    };
  }
}
