// src/lib/gas.js
export const GAS = "https://script.google.com/macros/s/AKfycbx5FniYFG6YWADrBbfkzVmsGBeqh4Je28x-doOePGC2yolON_C8quh42_gpSdrV9eru/exec";
const KEY = "GENERALISIMO@15769";

// Core fetch wrapper
async function call(action, params = {}) {
  const u = new URL(GAS);
  u.searchParams.set("action", action);
  u.searchParams.set("key", KEY);
  Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  const r = await fetch(u.toString(), { cache: "no-store" });
  const j = await r.json().catch(() => ({ ok: false, error: "bad_json" }));
  if (!j.ok) {
    console.error("GAS FAIL:", action, j);
    throw new Error(j.error || "api_error");
  }
  return j;
}

/* ---------- Dashboard ---------- */
export const overview           = () => call("summary"); // returns totals & KPIs

/* ---------- CPA Accounts ---------- */
export const cpaAccounts        = () => call("cpa_accounts");

/* ---------- Users ---------- */
export const users              = () => call("users");

/* ---------- Analytics ---------- */
export const analyticsOverview  = () => call("analyticsoverview");
export const analyticsMonthly   = () => call("revenue_monthly"); // your sheet name
export const analyticsGeo       = () => call("revenue_geo");     // your sheet name

/* ---------- Wallet ---------- */
export const walletOverview     = () => call("wallet_report");
export const walletHistory      = () => call("wallet_history");  // if implemented

/* ---------- Security ---------- */
export const securityOverview   = () => call("security_overview");

/* ---------- Monitoring ---------- */
export const ping               = () => call("ping");
export const forceSync          = () => call("sync");

// (Named export bundle if you prefer to import { api } )
export const api = {
  overview,
  cpaAccounts,
  users,
  analyticsOverview,
  analyticsMonthly,
  analyticsGeo,
  walletOverview,
  walletHistory,
  securityOverview,
  ping,
  forceSync,
};