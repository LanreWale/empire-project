/* assets/js/empire-auth.js — Auth shim (commander passphrase + user id) */

const EMPIRE_GAS_URL = "https://script.google.com/macros/s/AKfycbyKk68KWt9-tlhsKjX5N5sv7Tk0Y2gsAgEFmIaalBlPoDsibnNNy5puQeulRrwL5tb9/exec";

const EmpireAuth = (()=>{

  const KEY = "EmpireAuth.v2";

  function save(auth){
    localStorage.setItem(KEY, JSON.stringify(auth||{}));
    return auth;
  }

  function get(){
    try { return JSON.parse(localStorage.getItem(KEY)||"{}"); }
    catch { return {}; }
  }

  async function call(params){
    const u = new URL(EMPIRE_GAS_URL);
    Object.entries(params||{}).forEach(([k,v])=>u.searchParams.set(k, String(v)));
    const r = await fetch(u.toString(), { method:"GET", mode:"cors" });
    const j = await r.json().catch(()=>({}));
    if(!j || j.ok!==true) throw new Error("auth_failed");
    return j;
  }

  return {
    /** cred = {mode:'commander', pass} OR {mode:'user', id}  */
    async login(cred){
      if(!cred || !cred.mode) throw new Error("bad_args");

      if(cred.mode === "commander"){
        const j = await call({ action:"verifyCommander", pass: cred.pass });
        return save({ role:"commander", token:j.token||"", stamp:j.time||new Date().toISOString() });
      }else{
        const j = await call({ action:"verifyUser", id: cred.id });
        return save({ role:"user", id:j.id, email:j.email||"", phone:j.phone||"", token:j.token||"", stamp:j.time||new Date().toISOString() });
      }
    },

    async logout(){ localStorage.removeItem(KEY); return true; },

    async whoami(){ return get(); }
  };
})();