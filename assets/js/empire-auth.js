/* assets/js/empire-auth.js — FINAL, bullet-proof */

// ==== CONFIG (update if you redeploy GAS) ====
const EMPIRE_GAS_URL = "https://script.google.com/macros/s/AKfycbxiFK1m72rXH3pvS8VdhtQzi30kc1GXNOkjTU8dMSrH_4_KN3lnMwmgJDLOzfrqdXIU/exec";
const EMPIRE_API_KEY = "Lanreismail157@empireaffiliatemarketinghub_69";

// ==== Local storage helpers ====
function _empSave(email){
  localStorage.setItem("EmpireAuth", JSON.stringify({
    email: String(email||"").trim(),
    key: EMPIRE_API_KEY
  }));
}
function _empLoad(){
  try { return JSON.parse(localStorage.getItem("EmpireAuth") || "{}"); }
  catch { return {}; }
}

// ==== Health probe (confirms key + GAS app live) ====
async function _probe(){
  const u = new URL(EMPIRE_GAS_URL);
  u.searchParams.set("action","listassociates");
  u.searchParams.set("limit","1");
  u.searchParams.set("key",EMPIRE_API_KEY);
  const r = await fetch(u.toString(), { method:"GET" });
  const j = await r.json().catch(()=>({}));
  return !!(j && j.ok === true);
}

// ==== Core fetch wrapper to GAS ====
async function _gasFetch(params={}, body=null){
  const u = new URL(EMPIRE_GAS_URL);
  Object.entries(params||{}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  const auth = _empLoad();
  u.searchParams.set("key", auth.key || EMPIRE_API_KEY);

  const init = body
    ? { method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ ...params, key: auth.key || EMPIRE_API_KEY }) }
    : { method:"GET" };

  const res = await fetch(u.toString(), init);
  if(!res.ok) throw new Error("GAS fetch " + res.status);
  return res.json();
}

// ==== Public API ====
window.EmpireAuth = {
  // has a stored key?
  has(){ return !!(_empLoad().key); },
  who(){ const a=_empLoad(); return a.email || ""; },
  // stores id + key, then probes GAS to validate connectivity
  async login(identifier){
    _empSave(identifier);
    const ok = await _probe();
    if(!ok){ localStorage.removeItem("EmpireAuth"); throw new Error("unauthorized"); }
    return true;
  },
  logout(){ localStorage.removeItem("EmpireAuth"); },
  fetch: _gasFetch
};