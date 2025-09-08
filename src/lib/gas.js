// src/lib/gas.js
export const GAS = "https://script.google.com/macros/s/AKfycbyprKYvKf2KnnCyIeLtFZwTPqhc6RiFXqHxhaYDNFgXZAa2yEapU3m9b8lW226vatXy/exec"; // your /exec URL
const KEY = "THE_GENERALISIMO";

// tiny fetcher
async function call(action, params = {}) {
  const u = new URL(GAS);
  u.searchParams.set("action", action);
  u.searchParams.set("key", KEY);
  Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  const r = await fetch(u.toString(), { cache: "no-store" });
  const j = await r.json().catch(() => ({ ok: false, error: "bad_json" }));
  if (!j.ok) { console.error("GAS FAIL", action, j); throw new Error(j.error || "api_error"); }
  return j;
}

// exported API used by tabs
export const api = {
  // Dashboard
  overview:      () => call("overview"),

  // CPA
  cpaAccounts:   () => call("cpaaccounts"),

  // Users
  users:         () => call("users"),

  // Analytics
  analyticsOverview: () => call("analyticsoverview"),
  analyticsMonthly:  () => call("analyticsmonthly"),
  analyticsGeo:      () => call("analyticsgeo"),

  // Wallet
  walletOverview: () => call("walletoverview"),
  walletHistory:  () => call("wallethistory"),

  // Security
  securityOverview: () => call("securityoverview"),

  // Monitoring
  ping:        () => call("ping"),
  forceSync:   () => call("forcesync"),
};