// netlify/functions/events.js
"use strict";

const RESP=(c,o)=>({statusCode:c,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(o)});
const GAS_BASE=(process.env.GOOGLE_SHEETS_WEBAPP_URL||"").trim();
const GS_KEY=(process.env.GS_WEBAPP_KEY||"").trim();
const GS_SHEET=(process.env.GS_SHEET_ID||"").trim();

function q(url, params){
  const u=new URL(url);
  Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined&&v!==null) u.searchParams.set(k,String(v)); });
  return u.toString();
}

exports.handler = async (event) => {
  try{
    if(!GAS_BASE) return RESP(404,{ok:false,error:"GAS not configured"});
    const limit = Number(new URLSearchParams(event.rawQuery||"").get("limit") || 100);
    const url = q(GAS_BASE, { action:"events", key:GS_KEY, sheetId:GS_SHEET, limit });
    const r = await fetch(url);
    const data = await r.json().catch(()=> ({}));
    if(!r.ok || data.ok===false){
      return RESP(r.ok?502:r.status,{ok:false,error:data.error||"events failed",raw:data});
    }
    const events = (data.events||data.items||[]).map(e=>({
      ts:e.ts||e.time||e.timestamp||Date.now(),
      actor:e.actor||e.user||"",
      type:e.type||"",
      msg:e.msg||e.message||""
    }));
    return RESP(200,{ok:true,events});
  }catch(e){
    return RESP(500,{ok:false,error:String(e)});
  }
};