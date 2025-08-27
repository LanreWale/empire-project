// netlify/functions/summary.js
// Single endpoint that supplies: overview, accounts, users, analytics,
// and also accepts POST addAccount / addUser (no-op demo).
"use strict";

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(obj),
});

const GAS_URL = (process.env.GAS_BRIDGE_URL || process.env.GAS_WEB_APP_URL || "").trim();
const GS_KEY  = (process.env.GS_WEBAPP_KEY || "").trim();
const GS_SHEET_ID = (process.env.GS_SHEET_ID || "").trim();

function q(url, params){
  const u = new URL(url);
  Object.entries(params||{}).forEach(([k,v])=>{
    if (v!==undefined && v!==null) u.searchParams.set(k, String(v));
  });
  return u.toString();
}

// ---- Optional: read real values from your GAS if available
async function gasFetch(params){
  if (!GAS_URL) return null;
  const url = q(GAS_URL, Object.assign({ sheetId: GS_SHEET_ID, key: GS_KEY }, params));
  const r = await fetch(url).catch(()=>null);
  if (!r || !r.ok) return null;
  return r.json().catch(()=>null);
}

// ---- Default demo data (used when GAS doesn’t provide it)
function demoOverview(){
  return {
    ok: true,
    totalEarnings: 56446.74,
    activeUsers: 5,
    approvalRate: 59.6,
    pendingReviews: 7,
    trend: { labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], values: [5200, 3100, 1800, 4200, 7800, 2600, 900] },
    geo:   { labels: ["USA","UK","Nigeria","Canada","Australia","Others"], values: [43, 18, 15, 12, 7, 5] },
  };
}

function demoAccounts(){
  const mk = (n, rev, cl, cv) => ({ name:n, status:"ACTIVE", offers: Math.floor(600+Math.random()*1400), revenue:rev, clicks:cl, conversion:cv });
  return { ok:true, accounts: [
    mk("CPA #1553386", 18523.67, 14200, 58.4),
    mk("CPA #2286500",  7899.23,  4100, 62.3),
    mk("CPA #2288009",  2543.39,  1934, 55.7),
    mk("CPA #1909271", 15247.89,  1284, 61.2),
    mk("CPA #2378083",  5063.80,  1193, 54.7),
  ]};
}

function demoUsers(){
  return { ok:true, users:[
    { name:"SUPREME COMMANDER", email:"[email protected]", whatsapp:"+23480xxxxxxx", bank:"Command Bank", status:"ACTIVE" },
    { name:"Abdul Azeez Ajaja", email:"[email protected]", whatsapp:"+23480xxxxxxx", bank:"PalmPay", status:"ACTIVE" },
  ]};
}

function demoAnalytics(){
  return {
    ok:true,
    months:{ labels:["Jan","Feb","Mar","Apr","May","Jun","Jul"], values:[12000,15000,18000,22000,26000,31000,35000] },
    geo:   { labels:["USA","UK","Nigeria","Canada","Australia","China"], values:[35,20,18,12,10,5] },
    live: [
      { time:"8/27/2025, 10:24 AM", country:"Australia", type:"Survey", device:"Mobile", clicks:2007, leads:647, earnings:2030.01 },
      { time:"8/27/2025, 10:54 AM", country:"Nigeria",  type:"CC Submit", device:"Desktop", clicks:4309, leads:781, earnings:5758.54 },
    ],
  };
}

exports.handler = async (event) => {
  try{
    if (event.httpMethod === "GET") {
      const action = (event.queryStringParameters?.action || "overview").toLowerCase();

      // Try GAS first for each action; fall back to demo if missing
      if (action === "overview") {
        const g = await gasFetch({ action:"summary" }); // your GAS can return totals/geo/trend if you add it
        return RESP(200, g && g.ok ? g : demoOverview());
      }

      if (action === "accounts") {
        const g = await gasFetch({ action:"accounts", limit:5 });
        return RESP(200, g && g.ok ? g : demoAccounts());
      }

      if (action === "users") {
        const g = await gasFetch({ action:"users" });
        return RESP(200, g && g.ok ? g : demoUsers());
      }

      if (action === "analytics") {
        const g = await gasFetch({ action:"analytics" });
        return RESP(200, g && g.ok ? g : demoAnalytics());
      }

      return RESP(400, { ok:false, error:"Unknown action" });
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body||"{}");
      if (body.action === "addAccount") {
        // Here you could POST to GAS; we just confirm success.
        return RESP(200, { ok:true, received:body });
      }
      if (body.action === "addUser") {
        return RESP(200, { ok:true, received:body });
      }
      return RESP(400, { ok:false, error:"Unknown POST action" });
    }

    return RESP(405, { ok:false, error:"Method not allowed" });
  }catch(e){
    return RESP(500, { ok:false, error:String(e) });
  }
};