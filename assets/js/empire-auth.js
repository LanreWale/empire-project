<<<<<<< HEAD
/* THE EMPIRE — minimal client for GAS endpoints (case-insensitive) */
(function (g) {
  const BASE = "https://script.google.com/macros/s/AKfycbysJmVXlrOE1_J3uw5wMqs9cnKtj-uuoxj0Mmj8JWTj7eZMvp9XJYXrs-0leocNXI6w/exec";
  const PASS = "GENERALISIMO@2025";

  const store = {
    set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} },
    get(k){ try{ return JSON.parse(localStorage.getItem(k)||"null"); }catch{ return null; } },
    del(k){ try{ localStorage.removeItem(k); }catch{} }
  };

  async function call(action, params={}) {
    const usp = new URLSearchParams({ action, pass: PASS, ...(params||{}) });
    const url = `${BASE}?${usp.toString()}`;
    const res = await fetch(url, { headers: { "Cache-Control":"no-cache" }});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (j && j.ok === false) throw new Error(j.error || "api_error");
    return j;
  }

  const api = {
    base(){ return BASE; },
    has(){ return true; },                 // passphrase-only mode
    logout(){ /* noop for commander */ },

    // system
    ping(){ return call("ping"); },
    summary(){ return call("summary"); },
    walletmetrics(){ return call("walletmetrics"); },

    // lists (legacy)
    listOnboarding(limit=50){ return call("listonboarding", { limit }); },
    listAssociates(limit=50){ return call("listassociates", { limit }); },
    listWallet(limit=50){ return call("listwallet", { limit }); },

    // dashboard (camelCase; router accepts any case)
    commanderMetrics(){ return call("commanderMetrics"); },
    listCPAAccounts(){ return call("listCPAAccounts"); },
    analyticsOverview(){ return call("analyticsOverview"); },
    usersOverview(){ return call("usersOverview"); },
    walletOverview(){ return call("walletOverview"); },
    securityOverview(){ return call("securityOverview"); },
    monitoringFeed(){ return call("monitoringFeed"); },
  };

  g.EmpireAuth = api;
})(window);
=======
/* assets/js/empire-auth.js — FINAL */
const EMPIRE_GAS_URL = "https://script.google.com/macros/s/AKfycbyKk68KWt9-tlhsKjX5N5sv7Tk0Y2gsAgEFmIaalBlPoDsibnNNy5puQeulRrwL5tb9/exec";
const EMPIRE_API_KEY = "Lanreismail157@empireaffiliatemarketinghub_69";

function _empSave(email){
  localStorage.setItem("EmpireAuth", JSON.stringify({ email: String(email||"").trim(), key: EMPIRE_API_KEY }));
}
function _empGet(){
  try { return JSON.parse(localStorage.getItem("EmpireAuth")||"{}"); } catch { return {}; }
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
  async login(email){ _empSave(email); const ok = await _probe(); if(!ok){ this.clear(); throw new Error("unauthorized"); } return true; },
  fetch: _fetch
};
>>>>>>> 22fb6ea (Move legacy dashboard into /public/legacy/ and SPA redirects)
