/* Tiny auth helper for Empire admin (browser) */
window.EmpireAuth = (function () {
  const KEY = "EMPIRE_TOKEN";
  function get(){ try{ return localStorage.getItem(KEY) || ""; }catch{return ""} }
  function set(tok){ try{ localStorage.setItem(KEY, tok||""); }catch{} }
  function clear(){ try{ localStorage.removeItem(KEY); }catch{} }
  function has(){ return !!get(); }
  function authz(headers={}){ const t=get(); if(t) headers["Authorization"]="Bearer "+t; return headers; }
  async function authedFetch(url,opts={}){ 
    const headers=authz(Object.assign({ "Content-Type":"application/json" },opts.headers||{})); 
    const r=await fetch(url,Object.assign({},opts,{headers})); 
    if(r.status===401) throw new Error("Unauthorized"); 
    return r; 
  }
  return { get,set,clear,has,authz,authedFetch };
})();
