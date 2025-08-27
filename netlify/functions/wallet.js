// netlify/functions/wallet.js
"use strict";

const RESP=(c,o)=>({statusCode:c,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(o)});
const GAS_BASE=(process.env.GOOGLE_SHEETS_WEBAPP_URL||"").trim();
const GS_KEY=(process.env.GS_WEBAPP_KEY||"").trim();
const GS_SHEET=(process.env.GS_SHEET_ID||"").trim();

function q(url,p){const u=new URL(url);Object.entries(p||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null)u.searchParams.set(k,String(v));});return u.toString();}

exports.handler = async () => {
  try{
    if(!GAS_BASE) return RESP(404,{ok:false,error:"GAS not configured"});
    const url = q(GAS_BASE,{action:"wallet",key:GS_KEY,sheetId:GS_SHEET});
    const r = await fetch(url);
    const d = await r.json().catch(()=> ({}));
    if(!r.ok || d.ok===false) return RESP(r.ok?502:r.status,{ok:false,error:d.error||"wallet failed",raw:d});

    const items=(d.items||[]).map(x=>({
      ts:x.ts||x.time||x.date||"",
      amount:+x.amount||0,
      method:x.method||"",
      status:x.status||""
    }));
    const inflow=+d.inflow||0, outflow=+d.outflow||0;
    return RESP(200,{ok:true,inflow,outflow,net:inflow-outflow,items});
  }catch(e){ return RESP(500,{ok:false,error:String(e)}); }
};