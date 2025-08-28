// netlify/functions/analytics.js
"use strict";
<<<<<<< HEAD
const { get } = require("./lib/gas");

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async () => {
  try {
    // GAS should return: { ok:true, monthly:[{label, value}], geo:[{label,value}], live:[...] }
    const data = await get({ action: "analytics" });
    if (!data.ok) return RESP(502, data);
    return RESP(200, data);
  } catch (e) {
    return RESP(500, { ok: false, error: String(e) });
=======

const RESP = (code,obj)=>({statusCode:code,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(obj)});
const GAS_BASE=(process.env.GOOGLE_SHEETS_WEBAPP_URL||"").trim();
const GS_KEY=(process.env.GS_WEBAPP_KEY||"").trim();
const GS_SHEET=(process.env.GS_SHEET_ID||"").trim();

function q(url, params){
  const u=new URL(url);
  Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined&&v!==null) u.searchParams.set(k,String(v)); });
  return u.toString();
}

exports.handler = async () => {
  try{
    if(!GAS_BASE) return RESP(404,{ok:false,error:"GAS not configured"});
    const url = q(GAS_BASE, { action:"analytics", key:GS_KEY, sheetId:GS_SHEET });
    const r = await fetch(url);
    const data = await r.json().catch(()=> ({}));
    if(!r.ok || data.ok===false){
      return RESP(r.ok?502:r.status,{ok:false,error:data.error||"analytics failed",raw:data});
    }

    // Normalize
    const monthly = (data.monthly||data.bar||[]).map(x=>({
      label: x.label || x.month || "",
      value: +x.value || +x.earnings || 0
    }));

    const geo = (data.geo||data.pie||[]).map(x=>({
      label: x.label || x.country || "",
      value: +x.value || +x.earnings || 0
    }));

    const table = (data.table||data.live||[]).map(row=>({
      ts: row.ts || row.time || row.timestamp || "",
      country: row.country || "",
      offer: row.offer || row.type || "",
      device: row.device || "",
      clicks: +row.clicks || 0,
      leads: +row.leads || 0,
      earnings: +row.earnings || 0
    }));

    return RESP(200,{ ok:true, monthly, geo, table });
  }catch(e){
    return RESP(500,{ ok:false, error:String(e) });
