// netlify/functions/gs-bridge.js
function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const WEBAPP = process.env.GS_WEBHOOK_URL; // your Apps Script WebApp endpoint
const SHEET_ID = process.env.GS_SHEET_ID || "";
const RANGE = process.env.GS_RANGE || "";
const APP_KEY = process.env.GS_WEBAPP_KEY || ""; // optional

exports.handler = async (event) => {
  if (!WEBAPP) {
    return json(500, { ok: false, error: "GS_WEBHOOK_URL not set" });
  }

  try {
    if (event.httpMethod === "GET") {
      // Forward GET → GAS WebApp
      const u = new URL(WEBAPP);
      if (SHEET_ID) u.searchParams.set("sheetId", SHEET_ID);
      if (RANGE) u.searchParams.set("range", RANGE);
      if (APP_KEY) u.searchParams.set("key", APP_KEY);

      const r = await fetch(u.toString(), { method: "GET" });
      const data = await r.json().catch(() => ({}));
      return json(200, { ok: true, data });
    }

    if (event.httpMethod === "POST") {
      // Forward POST payload → GAS WebApp
      const payload = JSON.parse(event.body || "{}");
      const r = await fetch(WEBAPP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: SHEET_ID,
          key: APP_KEY,
          ...payload,
        }),
      });
      const data = await r.json().catch(() => ({}));
      return json(200, { ok: true, data });
    }

    return json(405, { ok: false, error: "Method not allowed" });
  } catch (e) {
    return json(500, { ok: false, error: e.message });
  }
};