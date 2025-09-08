// src/lib/gas.js
export const GAS = import.meta.env.VITE_GAS_URL || "<YOUR_WEB_APP_URL>/exec";
const KEY = import.meta.env.VITE_COMMANDER_KEY || "THE_GENERALISIMO";

function toJSON(ok, data){ return ok ? data : Promise.reject(new Error(data?.error || "Failed to fetch")); }

export async function api(action, params={}) {
  const u = new URL(GAS);
  u.searchParams.set("action", action);
  u.searchParams.set("key", KEY);   // matches GAS router
  Object.entries(params || {}).forEach(([k,v])=> u.searchParams.set(k, v));
  const r = await fetch(u.toString(), { cache:"no-store" });
  const j = await r.json().catch(()=>({ ok:false, error:"bad_json" }));
  return toJSON(j.ok, j);
}

// small helpers
export const fmt = {
  int:(n)=> (Number(n)||0).toLocaleString(),
  money:(n,cur="$")=> `${cur}${(Number(n)||0).toFixed(2)}`,
  pct:(n)=> `${(Number(n)||0).toFixed(2)}%`,
};

export const GAS_OK = () => api("ping");
export const overview      = () => api("overview");
export const cpaAccounts   = () => api("cpaaccounts");
export const usersList     = () => api("users");
export const walletSummary = () => api("walletoverview");
export const walletHistory = () => api("wallethistory");
export const analyticsOv   = () => api("analyticsoverview");
export const analyticsMon  = () => api("analyticsmonthly");
export const analyticsGeo  = () => api("analyticsgeo");
export const securityOv    = () => api("securityoverview");
export const forceSync     = () => api("forcesync");
export const getSummary    = () => api("summary");