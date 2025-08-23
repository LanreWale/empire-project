// Minimal fetch helpers pointed at Netlify Functions
export async function getJSON(path) {
  const r = await fetch(path, { headers: { "Accept": "application/json" } });
  return r.json();
}

export async function postJSON(path, body) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body || {})
  });
  return r.json();
}

// Endpoints
export const ENDPOINTS = {
  health: "/.netlify/functions/monitor-health",
  feed:   "/.netlify/functions/monitor-feed",
  sheets: "/.netlify/functions/sheets-sync",
  payout: "/.netlify/functions/wallet-transfer",
};