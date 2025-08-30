"use strict";
const { post } = require("./lib/http");
function json(statusCode, body){return{statusCode,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}}
const MAX_PAYOUT_NGN=Number(process.env.MAX_PAYOUT_NGN||"100000");
const ALLOWED_ROLES=(process.env.PAYOUT_ROLES||"ADMIN,COMMANDER").split(",").map(s=>s.trim().toUpperCase());
exports.handler=async(event)=>{try{
  if((event.httpMethod||"POST").toUpperCase()!=="POST")return json(405,{ok:false,error:"Method not allowed"});
  const adminSecret=(process.env.ADMIN_SECRET||"").trim();
  if(adminSecret){const got=event.headers["x-admin-secret"]||event.headers["X-Admin-Secret"];if(got!==adminSecret)return json(401,{ok:false,error:"Unauthorized"});}
  let body={}; try{body=JSON.parse(event.body||"{}");}catch{return json(400,{ok:false,error:"Bad JSON"})}
  const amount=Number(body.amount||0),currency=(body.currency||"NGN").toUpperCase(),role=String(body.role||"COMMANDER").toUpperCase(),provider=(body.provider||"flutterwave").toLowerCase();
  const dest=body.dest||{},account_bank=dest.bank||dest.account_bank,account_number=dest.account||dest.account_number;
  if(!ALLOWED_ROLES.includes(role))return json(403,{ok:false,error:`Role ${role} not allowed`});
  if(!amount||amount<=0)return json(400,{ok:false,error:"Invalid amount"});
  if(currency!=="NGN")return json(400,{ok:false,error:"Only NGN supported"});
  if(amount>MAX_PAYOUT_NGN)return json(403,{ok:false,error:`Amount exceeds cap ₦${MAX_PAYOUT_NGN}`});
  if(provider!=="flutterwave")return json(400,{ok:false,error:`Unsupported provider: ${provider}`});
  const FLW_SECRET_KEY=(process.env.FLW_SECRET_KEY||process.env.FLW_SECRET||"").trim();
  if(!FLW_SECRET_KEY)return json(500,{ok:false,error:"FLW_SECRET_KEY not set"});
  if(!account_bank||!account_number)return json(400,{ok:false,error:"Missing dest.bank or dest.account"});
  const reference=body.reference||`empire_${Date.now()}`,narration=body.narration||"Empire payout";
  const payload={account_bank,account_number,amount,narration,currency,reference};
  const url="https://api.flutterwave.com/v3/transfers";
  const res=await post(url,payload,{headers:{Authorization:`Bearer ${FLW_SECRET_KEY}`,"Content-Type":"application/json"},timeout:20000});
  const ok=(res.data&&(res.data.status==="success"||res.data.status==="SUCCESS"));
  if(!ok)return json(502,{ok:false,provider:"flutterwave",error:res.data||"Unknown error"});
  return json(200,{ok:true,provider:"flutterwave",result:res.data,reference});
}catch(e){const status=e.response?.status||500;return json(status,{ok:false,error:e.response?.data||e.message||String(e)})}}
