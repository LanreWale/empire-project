// src/lib/gas.js
export const GAS = "https://script.google.com/macros/s/AKfycbx5FniYFG6YWADrBbfkzVmsGBeqh4Je28x-doOePGC2yolON_C8quh42_gpSdrV9eru/exec";

// If your GAS checks a key/pass, set it here (and in GAS itself). Empty is allowed.
const KEY = ""; // set to your GAS key if required, else leave ""

async function call(action, params = {}) {
  const u = new URL(GAS);
  u.searchParams.set("action", action);
  if (KEY) u.searchParams.set("key", KEY);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json().catch(() => ({}));
  if (j && j.ok === false) throw new Error(j.error || "api_error");
  return j;
}

// Dashboard summary
export const getSummary        = () => call("summary");
// CPA Accounts
export const getCPAAccounts    = (limit=100) => call("cpa_accounts", { limit });
// Users
export const getUsers          = (limit=200) => call("users", { limit });
// Wallet/Payments
export const getWalletReport   = (limit=200) => call("wallet_report", { limit });
// Analytics – monthly revenue
export const getRevenueMonthly = () => call("revenue_monthly");
// Analytics – geo revenue
export const getRevenueGeo     = () => call("revenue_geo");
// Monitoring / health
export const ping              = () => call("ping");
export const forceSync         = () => call("sync");