/* assets/js/empire-auth.js — FINAL, minimal and global */

const EMPIRE_GAS_URL = "https://script.google.com/macros/s/AKfycbxiFK1m72rXH3pvS8VdhtQzi30kc1GXNOkjTU8dMSrH_4_KN3lnMwmgJDLOzfrqdXIU/exec";
const EMPIRE_API_KEY = "Lanreismail157@empireaffiliatemarketinghub_69";

function _empStore(data){
  localStorage.setItem("EmpireAuth", JSON.stringify({
    email: String((data && data.email) || "").trim(),
    key: EMPIRE_API_KEY
  }));
}
function _empLoad(){
  try { return JSON.parse(localStorage.getItem("EmpireAuth") || "{}"); }
  catch { return {}; }
}

async function _probe(){
  const u = new URL(EMPIRE_GAS_URL);
  u.searchParams.set("action", "listassociates");
  u.searchParams.set("limit", "1");
  u.searchParams.set("key", EMPIRE_API_KEY);
  const r = await fetch(u.toString(), { method: "GET" });
  const j = await r.json().catch(()=>({}));
  return j && j.ok === true;
}

async function _fetch(params = {}, body = null){
  const u = new URL(EMPIRE_GAS_URL);
  Object.entries(params || {}).forEach(([k,v]) => u.searchParams.set(k, v));
  const auth = _empLoad();
  u.searchParams.set("key", auth.key || EMPIRE_API_KEY);

  const init = body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...params, key: auth.key || EMPIRE_API_KEY }) }
    : { method: "GET" };

  const res = await fetch(u.toString(), init);
  if (!res.ok) throw new Error("fetch failed " + res.status);
  return res.json();
}

window.EmpireAuth = {
  has(){ return !!_empLoad().key; },
  who(){ const a=_empLoad(); return a.email || ""; },
  async login(identifier){
    _empStore({ email: identifier });
    const ok = await _probe();
    if (!ok) { localStorage.removeItem("EmpireAuth"); throw new Error("unauthorized"); }
    return true;
  },
  logout(){ localStorage.removeItem("EmpireAuth"); },
  fetch: _fetch
};