// netlify/functions/cpa-list.js
// Return all CPA Grip accounts + live metrics

"use strict";

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

// Fake data fallback (for testing if real API fails)
const FAKE = [
  { id: "1533836", name: "Olanrewaju I.", offers: 120, revenue: 3250.45, clicks: 18432, conversionRate: 0.13 },
  { id: "2387883", name: "Olawale Akanni", offers: 98, revenue: 2198.70, clicks: 15222, conversionRate: 0.09 },
  { id: "2288009", name: "Sikirat Junaid", offers: 76, revenue: 1350.15, clicks: 10145, conversionRate: 0.08 },
  { id: "1533837", name: "Lanre Parent", offers: 50, revenue: 845.00, clicks: 6544, conversionRate: 0.07 },
];

exports.handler = async () => {
  try {
    // 🔑 Replace this block with real API calls to CPA Grip JSON / RSS feed
    // Example (pseudo-code):
    // const r = await fetch("https://www.cpagrip.com/common/offer_feed_json.php?user_id=XXXX&pubkey=XXXX");
    // const data = await r.json();
    // return RESP(200, { ok: true, accounts: transform(data) });

    return RESP(200, { ok: true, accounts: FAKE });
  } catch (e) {
    return RESP(500, { ok: false, error: String(e) });
  }
};