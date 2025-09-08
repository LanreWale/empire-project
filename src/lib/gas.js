// src/lib/gas.js
export const GAS = "https://script.google.com/macros/s/AKfycbysJmVXlrOE1_J3uw5wMqs9cnKtj-uuoxj0Mmj8JWTj7eZMvp9XJYXrs-0leocNXI6w/exec"; // your live URL
const KEY = ""; // if your GAS needs ?key=, put it here; else leave ""

async function getJSON(params = {}) {
  const u = new URL(GAS);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  if (KEY) u.searchParams.set("key", KEY);
  const res = await fetch(u.toString(), { headers: { "Cache-Control": "no-cache" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json().catch(() => ({}));
  if (j && j.ok === false) throw new Error(j.error || "api_error");
  return j;
}

// already used by Monitoring
export const ping        = () => getJSON({ action: "ping" });
export const forceSync   = () => getJSON({ action: "forcesync" });

// used by tabs below
export const getSummary       = () => getJSON({ action: "summary" });
export const listCPAAccounts  = () => getJSON({ action: "cpa" });
export const listUsers        = () => getJSON({ action: "users" });
export const getAnalytics     = () => getJSON({ action: "analytics" });
export const getWallet        = () => getJSON({ action: "wallet" });