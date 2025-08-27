// netlify/functions/summary.js
"use strict";

const RESP=(c,o)=>({statusCode:c,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(o)});
const GAS_BASE=(process.env.GOOGLE_SHEETS_WEBAPP_URL||"").trim();
const GS_KEY=(process.env.GS_WEBAPP_KEY||"").trim();
const GS_SHEET=(process.env.GS_SHEET_ID||"").trim();

function q(url,p){const u=new URL(url);Object.entries(p||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null)u.searchParams.set(k,String(v));});return u.toString();}

exports.handler = async () => {
  try{
    if(!GAS_BASE) return RESP(404,{ok:false,error:"GAS not configured"});
    const url = q(GAS_BASE,{action:"summary",key:GS_KEY,sheetId:GS_SHEET});
    const r = await fetch(url);
    const d = await r.json().catch(()=> ({}));
    if(!r.ok || d.ok===false) return RESP(r.ok?502:r.status,{ok:false,error:d.error||"summary failed",raw:d});
    return RESP(200,{
      ok:true,
      totalEarnings: +d.totalEarnings || +d.earnings || 0,
      activeUsers: +d.activeUsers || 0,
      pendingReviews: +d.pendingReviews || +d.pending || 0,
      approvalRate: d.approvalRate!=null ? +d.approvalRate : null
    });
  }catch(e){ return RESP(500,{ok:false,error:String(e)}); }
};