/* assets/js/empire-auth.js — clean, no <script> tags */

// === GAS SETTINGS (engine room) ===
const EMPIRE_GAS_URL = "https://script.google.com/macros/s/AKfycbxiFK1m72rXH3pvS8VdhtQzi30kc1GXNOkjTU8dMSrH_4_KN3lnMwmgJDLOzfrqdXIU/exec";
const EMPIRE_API_KEY = "Lanreismail157@empireaffiliatemarketinghub_69";

// ---- local auth profile (only email label + key) ----
function _empSaveAuth(email){
  const data = { email: String(email||"").trim(), key: EMPIRE_API_KEY };
  localStorage.setItem("EmpireAuth", JSON.stringify(data));
  return data;
}
function _empGetAuth(){
  try{ return JSON.parse(localStorage.getItem("EmpireAuth")||"{}"); }catch{ return {}; }
}

// ---- core fetch wrapper; auto-injects key ----
async function empireFetch(params={}, body=null){
  const auth = _empGetAuth();
  const url = new URL(EMPIRE_GAS_URL);
  Object.entries(params||{}).forEach(([k,v])=> url.searchParams.set(k, v));
  url.searchParams.set("key", auth.key || EMPIRE_API_KEY);

  const init = body
    ? { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) }
    : { method:"GET" };

  const res = await fetch(url, init);
  const json = await res.json().catch(()=>({ ok:false, error:"bad_json" }));
  // If GAS says unauthorized, bubble it
  if(json && json.ok===false && /unauthorized/i.test(json.error||"")) throw new Error("unauthorized");
  return json;
}

// ---- simple probe against a gated endpoint (requires key) ----
async function _empProbe(){
  const url = new URL(EMPIRE_GAS_URL);
  url.searchParams.set("action","listassociates");
  url.searchParams.set("limit","1");
  url.searchParams.set("key", EMPIRE_API_KEY);
  const r = await fetch(url.toString());
  const j = await r.json().catch(()=>({}));
  return j && j.ok === true;
}

// ---- public API ----
window.EmpireAuth = {
  url(){ return EMPIRE_GAS_URL; },
  get(){ return _empGetAuth(); },
  has(){ const a=_empGetAuth(); return !!(a.key); },
  clear(){ localStorage.removeItem("EmpireAuth"); },
  async login(email){
    _empSaveAuth(email);
    const ok = await _empProbe(); // checks key only
    if(!ok){ this.clear(); throw new Error("unauthorized"); }
    return true;
  },
  fetch: empireFetch
};