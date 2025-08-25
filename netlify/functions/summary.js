// netlify/functions/summary.js
"use strict";

exports.handler = async () => {
  try {
    const base = process.env.SHEETS_BASE || process.env.EMPIRE_APPS_SCRIPT_BASE || "";
    if (!base) return json(500, { ok:false, error:"Missing SHEETS_BASE (Apps Script /exec URL)" });

    const r = await fetch(`${base}?action=summary`, { headers: { Accept: "application/json" } });
    const text = await r.text();

    // Try parse; normalize shape the dashboard expects
    let data;
    try { data = JSON.parse(text); } catch { return json(502, { ok:false, error:"Bad JSON from Apps Script", raw:text }); }

    return json(200, {
      ok: !!data.ok,
      totalEarnings: Number(data.totalEarnings || 0),
      activeUsers: Number(data.activeUsers || 0),
      approvalRate: Number(data.approvalRate || 0),
      pendingReviews: Number(data.pendingReviews || 0)
    });
  } catch (e) {
    return json(500, { ok:false, error:String(e) });
  }
};

function json(code, body){
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}