// netlify/functions/admin-pending.js
"use strict";

// Node 18+ provides global fetch — no need for `node-fetch`

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  const secret = process.env.ADMIN_SECRET || "changeme";
  if (event.headers["x-admin-secret"] !== secret) {
    return json(401, { ok: false, error: "Unauthorized" });
  }

  const base = process.env.GOOGLE_SHEETS_WEBAPP_URL;
  const key  = process.env.GS_WEBAPP_KEY;
  const sid  = process.env.GS_SHEET_ID;

  if (!base || !key || !sid) {
    return json(500, { ok: false, error: "Missing GOOGLE_SHEETS_WEBAPP_URL / GS_WEBAPP_KEY / GS_SHEET_ID" });
  }

  try {
    const method = (event.httpMethod || "GET").toUpperCase();

    if (method === "GET") {
      // Adjust param names if your WebApp expects different ones
      const url = `${base}?action=listPending&sheetId=${encodeURIComponent(sid)}&key=${encodeURIComponent(key)}`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      const data = await res.json().catch(() => ({ ok: false, error: "Bad JSON" }));
      // Expecting { ok:true, items:[{id,name,email,phone,telegram}] }
      return json(200, data);
    }

    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");
      // action: 'mark', id: 'rowId', status: 'approved'|'dismissed'
      if (body.action === "mark" && body.id) {
        const url = `${base}?action=mark&id=${encodeURIComponent(body.id)}&status=${encodeURIComponent(body.status || "approved")}&sheetId=${encodeURIComponent(sid)}&key=${encodeURIComponent(key)}`;
        const res = await fetch(url, { headers: { "Accept": "application/json" } });
        const data = await res.json().catch(() => ({ ok: false, error: "Bad JSON" }));
        return json(200, data);
      }
      return json(400, { ok: false, error: "Unknown action" });
    }

    return json(405, { ok: false, error: "Method not allowed" });
  } catch (e) {
    return json(500, { ok: false, error: e.message });
  }
};