/* empire-auth.js — minimal, uses your GAS URL */

(() => {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbyKk68KWt9-tlhsKjX5N5sv7Tk0Y2gsAgEFmIaalBlPoDsibnNNy5puQeulRrwL5tb9/exec";

  function qs(o){
    const u=new URL(GAS_URL);
    Object.entries(o||{}).forEach(([k,v])=>u.searchParams.set(k,v));
    return u.toString();
  }
  async function call(o){ const r=await fetch(qs(o),{cache:"no-store"}); return r.json(); }

  window.EmpireAuth = {
    async login(identifier){
      const j = await call({action:"login", identifier});
      if(!j.ok) throw new Error(j.error||"unauthorized");
      localStorage.setItem("EmpireAuth", JSON.stringify({id:identifier, role:j.role||"Associate", ts:Date.now()}));
      return j;
    },
    async summary(){ return call({action:"summary"}); },
    async cpa(){ return call({action:"cpasummary"}); },
    async users(){ return call({action:"usersummary"}); },
    async analytics(){ return call({action:"analytics24h"}); },
    async wallet(){ return call({action:"wallet24h"}); },
    async security(){ return call({action:"security24h"}); },
    async monitor(){ return call({action:"monitoring"}); },
    me(){ try{return JSON.parse(localStorage.getItem("EmpireAuth")||"{}");}catch{return{}}; },
    logout(){ localStorage.removeItem("EmpireAuth"); }
  };
})();