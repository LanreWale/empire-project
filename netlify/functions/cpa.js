// netlify/functions/cpa.js
"use strict";

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(obj),
});

const GAS_BASE = (process.env.GOOGLE_SHEETS_WEBAPP_URL || "").trim();
const GS_KEY   = (process.env.GS_WEBAPP_KEY || "").trim();
const GS_SHEET = (process.env.GS_SHEET_ID || "").trim();

function q(url, params) {
  const u = new URL(url);
  Object.entries(params || {}).forEach(([k,v])=>{
    if (v !== undefined && v !== null) u.searchParams.set(k,String(v));
  });
  return u.toString();
}

exports.handler = async () => {
  try{
    if(!GAS_BASE) return RESP(404,{ ok:false, error:"GAS not configured" });
    const url = q(GAS_BASE, { action:"cpaAccounts", key:GS_KEY, sheetId:GS_SHEET });
    const r = await fetch(url);
    const data = await r.json().catch(()=> ({}));

    if(!r.ok || data.ok === false){
      return RESP(r.ok ? 502 : r.status, { ok:false, error:data.error || "CPA fetch failed", raw:data });
    }

    // Normalize to expected shape
    const items = (data.accounts || data.items || []).map(a => ({
      id: a.id || a.accountId || "",
      name: a.name || a.account || "CPA",
      today: +a.today || 0,
      yesterday: +a.yesterday || 0,
      d7: +a.d7 || +a.sevenDay || 0,
      d30: +a.d30 || +a.thirtyDay || 0,
      epc: a.epc ?? "-",
      cr:  a.cr  ?? "-",
      status: a.status || "ACTIVE"
    }));

    return RESP(200, { ok:true, accounts: items });
  }catch(e){
    return RESP(500,{ ok:false, error:String(e) });
  }
};