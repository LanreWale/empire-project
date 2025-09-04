<!-- /js/empire-auth.js -->
<script>
(function(){
  // 🔧 Configure once
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxiFK1m72rXH3pvS8VdhtQzi30kc1GXNOkjTU8dMSrH_4_KN3lnMwmgJDLOzfrqdXIU/exec";
  const API_KEY = "Lanreismail157@empireaffiliatemarketinghub_69";

  function saveAuth(email){
    const data = { email: String(email||"").trim(), key: API_KEY };
    localStorage.setItem("EmpireAuth", JSON.stringify(data));
    return data;
  }
  function getAuth(){
    try{ return JSON.parse(localStorage.getItem("EmpireAuth")||"{}"); }catch{ return {}; }
  }

  async function gatedProbe(){
    const { key } = getAuth();
    const u = new URL(GAS_URL);
    u.searchParams.set("action","listlogs");
    u.searchParams.set("key", key||"");
    const r = await fetch(u, { method:"GET" });
    const j = await r.json().catch(()=>({}));
    return j && j.ok === true;
  }

  // Global wrapper for all GET/POST calls to GAS
  async function gasFetch(params={}, body=null){
    const auth = getAuth();
    const url = new URL(GAS_URL);
    Object.entries(params||{}).forEach(([k,v])=> url.searchParams.set(k, v));
    url.searchParams.set("key", auth.key || API_KEY);            // <-- injects key
    const init = body
      ? { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) }
      : { method:"GET" };
    const res = await fetch(url, init);
    const json = await res.json();
    if(json && json.ok===false && /unauthorized/i.test(json.error||"")) throw new Error("unauthorized");
    return json;
  }

  window.EmpireAuth = {
    url(){ return GAS_URL; },
    get(){ return getAuth(); },
    has(){ const a=getAuth(); return !!(a.key); },
    clear(){ localStorage.removeItem("EmpireAuth"); },
    // email is just for local profile; key is fixed (Script Property)
    async login(email){
      saveAuth(email);
      const ok = await gatedProbe();
      if(!ok){ localStorage.removeItem("EmpireAuth"); throw new Error("unauthorized"); }
      return true;
    },
    fetch: gasFetch
  };
})();
</script>