// netlify/functions/cpa-add.js
function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const WEBAPP = process.env.GS_WEBHOOK_URL;
const SHEET_ID = process.env.GS_SHEET_ID || "";
const APP_KEY = process.env.GS_WEBAPP_KEY || ""; // optional

const REQUIRED = ["name", "domain", "user", "apiKey"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  // Admin guard
  const admin = event.headers["x-admin-secret"] || event.headers["X-Admin-Secret"];
  if (!admin) {
    return json(401, { ok: false, error: "Missing admin secret" });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const missing = REQUIRED.filter((k) => !(k in body) || String(body[k]).trim() === "");
  if (missing.length) {
    return json(400, { ok: false, error: `Missing fields: ${missing.join(", ")}` });
  }

  const payload = {
    sheetId: SHEET_ID,
    key: APP_KEY,
    type: "CPA_ADD",
    data: {
      name: String(body.name).trim(),
      domain: String(body.domain).trim(),
      user: String(body.user).trim(),
      apiKey: String(body.apiKey).trim(),
      startingRevenue: Number(body.startingRevenue || 0) || 0,
      createdAt: new Date().toISOString(),
    },
  };

  // Forward to Apps Script
  if (!WEBAPP) {
    return json(500, { ok: false, error: "GS_WEBHOOK_URL not set" });
  }

  try {
    const r = await fetch(WEBAPP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    return json(200, { ok: true, message: "CPA account saved", data });
  } catch (e) {
    return json(500, { ok: false, error: e.message });
  }
};