"use strict";

exports.handler = async (event) => {
  try {
    // Require a bearer token (same as /me)
    const token = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return j(401, { ok:false, error:"No token" });

    const base = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
    const key  = process.env.GS_WEBAPP_KEY || "";
    const sid  = process.env.GS_SHEET_ID || "";
    if (!base || !key) return j(500, { ok:false, error:"Missing GOOGLE_SHEETS_WEBAPP_URL / GS_WEBAPP_KEY" });

    const r = await fetch(base, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action:"summary", key, sheetId:sid }),
    });

    const data = await r.json().catch(()=>({ ok:false, error:"Bad JSON from Apps Script" }));
    if (!data.ok) return j(502, { ok:false, error:data.error || "Apps Script error" });

    // Expected from Apps Script:
    // { ok:true, total_earnings, active_users, approval_rate, pending_reviews, currency }
    return j(200, data);
  } catch (e) {
    return j(500, { ok:false, error:String(e.message||e) });
  }
};

function j(code, body){
  return { statusCode:code, headers:{ "content-type":"application/json" }, body:JSON.stringify(body) };
}