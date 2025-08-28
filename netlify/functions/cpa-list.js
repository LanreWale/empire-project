// netlify/functions/cpa-list.js
// Returns CPA Grip accounts + live-ish metrics, without huge env vars.
// Primary source: your Google Apps Script Web App (?cpa=1)
// Fallback: tiny static sample so the UI never breaks.

"use strict";

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Cache-Control":"no-store" },
  body: JSON.stringify(obj),
});

// Small fallback (safe, tiny)
const FALLBACK = [
  { id:"1533836", name:"Olanrewaju I.", domain:"filetrkr.com", offers:0, revenue:0, clicks:0, conversionRate:0 },
  { id:"1909271", name:"Ismail W.",      domain:"motifiles.com", offers:0, revenue:0, clicks:0, conversionRate:0 },
  { id:"2387883", name:"Olawale Akanni", domain:"motifiles.com", offers:0, revenue:0, clicks:0, conversionRate:0 },
  { id:"2286960", name:"Lanry W.",       domain:"motifiles.com", offers:0, revenue:0, clicks:0, conversionRate:0 },
  { id:"2288009", name:"Sikirat Junaid", domain:"motifiles.com", offers:0, revenue:0, clicks:0, conversionRate:0 },
];

const GAS =
  (process.env.GAS_BRIDGE_URL ||
   process.env.GAS_WEB_APP_URL ||
   process.env.GOOGLE_SHEETS_WEBAPP_URL || // you used this earlier
   "").trim();

exports.handler = async () => {
  // If no GAS configured, return fallback (keeps UI alive)
  if (!GAS) return RESP(200, { ok: true, accounts: FALLBACK, source: "fallback", warning: "No GAS URL set" });

  try {
    const u = new URL(GAS);
    // Ask GAS for CPA list. Your code.gs should handle this flag.
    u.searchParams.set("cpa", "1");

    const r = await fetch(u.toString(), { headers: { "Cache-Control": "no-cache" }});
    const data = await r.json().catch(()=> ({}));

    if (!r.ok || data?.ok === false) {
      return RESP(r.status || 502, { ok: false, error: data?.error || "Upstream error", upstream: data });
    }

    // Accept a few possible shapes from GAS
    const items = Array.isArray(data?.items) ? data.items
                : Array.isArray(data?.accounts) ? data.accounts
                : Array.isArray(data) ? data
                : [];

    // Normalize to what the dashboard expects
    const accounts = items.map(x => ({
      id: String(x.id ?? x.userId ?? ""),
      name: x.name ?? "",
      domain: x.domain ?? x.customDomain ?? "",
      offers: Number(x.offers ?? x.activeOffers ?? 0),
      revenue: Number(x.revenue ?? x.totalRevenue ?? 0),
      clicks: Number(x.clicks ?? 0),
      conversionRate: typeof x.conversionRate === "number" ? x.conversionRate
                      : (typeof x.conversionRate === "string" && x.conversionRate.endsWith("%"))
                        ? (parseFloat(x.conversionRate)/100) : 0,
      // pass-through extras if present (not required by UI)
      pubKey: x.pubKey, apiKey: x.apiKey, jsonUrl: x.jsonUrl, rssUrl: x.rssUrl, csvUrl: x.csvUrl, leadCheckUrl: x.leadCheckUrl
    }));

    return RESP(200, { ok: true, accounts, source: "gas" });
  } catch (e) {
    // On any error, do not break deploy or UI
    return RESP(200, { ok: true, accounts: FALLBACK, source: "fallback", warning: String(e) });
  }
};