// netlify/functions/revoke-user.js
"use strict";

const axios = require("axios");
const { telegram, whatsapp } = require("./lib/notify");

const json = (s,b)=>({statusCode:s,headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
const safeJSON = (s)=>{try{return JSON.parse(s||"{}")}catch{return{}}};

exports.handler = async (event)=>{
  try{
    if(event.httpMethod!=="POST") return json(405,{ok:false,error:"Method not allowed"});

    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) return json(401, { ok:false, error:"Unauthorized" });

    const { email="", reason="", phone="" } = safeJSON(event.body);
    if(!email) return json(400,{ok:false,error:"Missing email"});

    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    if (!siteOrigin) return json(500, { ok:false, error:"Missing site origin at runtime" });
    const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;

    const now = new Date().toISOString();
    const logRow = [now,"Commander",`Suspended ${email}`, reason || ""];
    const logResp = await axios.post(gsBridge,{action:"append",sheet:"Event_Log",values:logRow},{timeout:12000})
      .then(r=>r.data).catch(e=>({ok:false,error:String(e?.response?.data||e.message||e)}));

    const updResp = await axios.post(gsBridge,{
      action:"upsert",sheet:"New Associates",keyCol:"Email",keyVal:email,updates:{Level:"0x"}
    },{timeout:12000}).then(r=>r.data).catch(e=>({ok:false,error:String(e?.response?.data||e.message||e)}));

    const tg = await telegram(`⛔ *Suspended*\nEmail: ${email}\nReason: ${reason||"—"}`).catch(()=>({ok:false}));
    let wa=null; if(phone) wa=await whatsapp(phone,`Your Empire access is suspended.${reason?` Reason: ${reason}.`:""}`).catch(()=>({ok:false}));

    return json(200,{ok:true,eventLog:logResp,update:updResp,telegram:tg,whatsapp:wa});
  }catch(err){
    return json(200,{ok:false,error:err.message||String(err)});
  }
};