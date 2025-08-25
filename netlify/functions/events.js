"use strict";

exports.handler = async (event) => {
  try {
    const token = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return j(401, { ok:false, error:"No token" });

    const base = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
    const key  = process.env.GS_WEBAPP_KEY || "";
    const sid  = process.env.GS_SHEET_ID || "";
    if (!base || !key) return j(500, { ok:false, error:"Missing GOOGLE_SHEETS_WEBAPP_URL / GS_WEBAPP_KEY" });

    const qs = new URLSearchParams(event.queryStringParameters || {});
    const limit = Math.max(1, Math.min(100, Number(qs.get("limit")) || 50));

    const r = await fetch(base, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action:"events", key, sheetId:sid, limit }),
    });

    const data = await r.json().catch(()=>({ ok:false, error:"Bad JSON from Apps Script" }));
    if (!data.ok) return j(502, { ok:false, error:data.error || "Apps Script error" });

    // Normalize to { ok:true, events:{ items:[...] } }
    return j(200, { ok:true, events: data });
  } catch (e) {
    return j(500, { ok:false, error:String(e.message||e) });
  }
};

function j(code, body){
  return { statusCode:code, headers:{ "content-type":"application/json" }, body:JSON.stringify(body) };
}