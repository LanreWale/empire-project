// src/lib/gas.js
const GAS = "https://script.google.com/macros/s/AKfycbx5FniYFG6YWADrBbfkzVmsGBeqh4Je28x-doOePGC2yolON_C8quh42_gpSdrV9eru/exec";

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, { method: "GET", ...opts });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  // If GAS returns text for health, try both
  const ct = r.headers.get("content-type") || "";
  return ct.includes("application/json") ? r.json() : r.text();
}

export async function ping() {
  return fetchJson(GAS);
}

export async function forceSync() {
  return fetchJson(`${GAS}?action=sync`);
}

// example data pull (adjust to your GAS actions if needed)
export async function getSummary() {
  return fetchJson(`${GAS}?action=summary`);
}

export { GAS };