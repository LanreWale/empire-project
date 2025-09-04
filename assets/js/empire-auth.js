/* assets/js/empire-auth.js — FINAL */

const EMPIRE_GAS_URL = "https://script.google.com/macros/s/AKfycbxiFK1m72rXH3pvS8VdhtQzi30kc1GXNOkjTU8dMSrH_4_KN3lnMwmgJDLOzfrqdXIU/exec";
const EMPIRE_API_KEY = "Lanreismail157@empireaffiliatemarketinghub_69";

function _empSave(email){
  localStorage.setItem("EmpireAuth", JSON.stringify({
    email: String(email||"").trim(),
    key: EMPIRE_API_KEY
  }));
}
function _empGet(){
  try { return JSON.parse(localStorage.getItem("EmpireAuth")||"{}"); }
  catch { return {}; }
}

async function _probe(){
  const u = new URL(EMPIRE_GAS_URL);
  u.searchParams.set("action","listassociates");
  u.searchParams.set("limit","1");
  u.searchParams.set("key", EMPIRE_API_KEY);
  const r = await fetch(u.toString());
  const j = await r.json().catch(()=>({}));
  return j && j.ok === true;
}

async function _fetch(params={}, body=null){
  const u = new URL(EMPIRE_GAS_URL);
  Object.entries(params||{}).forEach(([k,v])=> u.searchParams.set(k, v));
  const auth = _empGet();
  u.searchParams.set("key", auth.key || EMPIRE_API_KEY);

  const init = body
    ? { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) }
    : { method:"GET" };

  const res = await fetch(u, init);
  const json = await res.json().catch(()=>({ ok:false, error:"bad_json" }));
  if(json && json.ok===false && /unauthorized/i.test(json.error||"")) throw new Error("unauthorized");
  return json;
}

window.EmpireAuth = {
  url(){ return EMPIRE_GAS_URL; },
  get(){ return _empGet(); },
  has(){ return !!_empGet().key; },
  clear(){ localStorage.removeItem("EmpireAuth"); },

  // called from login button
  async login(email){
    _empSave(email);
    const ok = await _probe();
    if(!ok){ this.clear(); throw new Error("unauthorized"); }
    return true;
  },

  // generic fetch you can use everywhere
  fetch: _fetch
};