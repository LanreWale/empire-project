// netlify/functions/events.js
"use strict";

exports.handler = async (event) => {
  try {
    const base = process.env.SHEETS_BASE || process.env.EMPIRE_APPS_SCRIPT_BASE || "";
    if (!base) return json(500, { ok:false, error:"Missing SHEETS_BASE (Apps Script /exec URL)" });

    const q = new URLSearchParams(event.queryStringParameters || {});
    const limit = Math.max(1, Math.min(200, Number(q.get("limit") || 20)));

    const r = await fetch(`${base}?action=events&limit=${limit}`, { headers: { Accept: "application/json" } });
    const text = await r.text();

    let data;
    try { data = JSON.parse(text); } catch { return json(502, { ok:false, error:"Bad JSON from Apps Script", raw:text }); }

    return json(200, { ok: !!data.ok, events: Array.isArray(data.events) ? data.events : [] });
  } catch (e) {
    return json(500, { ok:false, error:String(e) });
  }
};

function json(code, body){
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}