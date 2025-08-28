// netlify/functions/cpa-list.js
// Live CPA Grip accounts + metrics (no secrets in repo)
// Reads accounts from env CPAGRIP_ACCOUNTS_JSON and fetches:
// - offer_feed_json (for offers & payout info)
// - lead_check_rss (for recent leads)
// Caches response in-memory for 60s.

"use strict";

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(obj),
});

// ---- Config & cache
const TTL_MS = 60 * 1000;
let CACHE = { ts: 0, data: null };

function now() { return Date.now(); }
function within(a, b) { return now() - a < b; }

// ---- Load accounts from env
function loadAccounts() {
  const raw = process.env.CPAGRIP_ACCOUNTS_JSON;
  if (!raw) throw new Error("Missing CPAGRIP_ACCOUNTS_JSON env var");

  let arr = [];
  try { arr = JSON.parse(raw); } catch { throw new Error("CPAGRIP_ACCOUNTS_JSON is not valid JSON"); }

  // Normalize & validate
  return arr.map((a, i) => {
    const id = String(a.id || "").trim();
    const name = String(a.name || `Account #${i + 1}`).trim();
    const domain = String(a.domain || "").trim();

    // Prefer explicit URLs if provided; else build from pubKey/apiKey
    let jsonUrl = a.jsonUrl;
    if (!jsonUrl && a.pubKey) {
      jsonUrl = `https://www.cpagrip.com/common/offer_feed_json.php?user_id=${encodeURIComponent(id)}&pubkey=${encodeURIComponent(a.pubKey)}`;
    }
    let leadCheckUrl = a.leadCheckUrl;
    if (!leadCheckUrl && a.apiKey) {
      leadCheckUrl = `https://www.cpagrip.com/common/lead_check_rss.php?user_id=${encodeURIComponent(id)}&key=${encodeURIComponent(a.apiKey)}`;
    }

    if (!id || !jsonUrl) {
      throw new Error(`Account missing id/jsonUrl (id=${id || 'N/A'})`);
    }

    return {
      id, name, domain,
      jsonUrl,
      leadCheckUrl: leadCheckUrl || null,
    };
  });
}

// ---- Helpers
async function fetchJSON(url) {
  const r = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
}

// Very light RSS item counter for last 24h
function countLeads24h(rssText) {
  // naive parse; counts <item> with <pubDate> in last 24h
  const items = rssText.split("<item>").slice(1);
  if (items.length === 0) return 0;
  const cutoff = now() - 24 * 60 * 60 * 1000;
  let n = 0;
  for (const chunk of items) {
    const m = chunk.match(/<pubDate>([^<]+)<\/pubDate>/i);
    if (!m) continue;
    const t = Date.parse(m[1]);
    if (!isNaN(t) && t >= cutoff) n++;
  }
  return n;
}

// Compute metrics from offer feed
function analyzeOffers(offers) {
  if (!Array.isArray(offers)) return { offers: 0, avgPayout: 0 };
  const payouts = [];
  for (const o of offers) {
    // CPA Grip JSON: payout might be in o.payout or o.rate (varies)
    const p = Number(o.payout ?? o.rate ?? 0);
    if (!isNaN(p) && p > 0) payouts.push(p);
  }
  const offersCnt = offers.length;
  const avg = payouts.length ? (payouts.reduce((a, b) => a + b, 0) / payouts.length) : 0;
  return { offers: offersCnt, avgPayout: +avg.toFixed(2) };
}

// ---- Main fetch per account
async function fetchAccountMetrics(acc) {
  const out = {
    id: acc.id,
    name: acc.name,
    domain: acc.domain || "",
    offers: 0,
    avgPayout: 0,
    leads24h: null,
    estRevenue24h: null,
    _sources: {}
  };

  // 1) Offers JSON
  try {
    const j = await fetchJSON(acc.jsonUrl);
    // CPA Grip sometimes returns array or {offers:[]}
    const offers = Array.isArray(j) ? j : (Array.isArray(j.offers) ? j.offers : []);
    const a = analyzeOffers(offers);
    out.offers = a.offers;
    out.avgPayout = a.avgPayout;
    out._sources.offers = "json";
  } catch (e) {
    out._sources.offers = "error:" + String(e.message || e);
  }

  // 2) Lead check RSS (optional)
  if (acc.leadCheckUrl) {
    try {
      const rss = await fetchText(acc.leadCheckUrl);
      const leads = countLeads24h(rss);
      out.leads24h = leads;
      out.estRevenue24h = +(leads * (out.avgPayout || 0)).toFixed(2);
      out._sources.leads = "rss";
    } catch (e) {
      out._sources.leads = "error:" + String(e.message || e);
    }
  }

  return out;
}

// ---- Handler
exports.handler = async () => {
  try {
    // Serve cache
    if (CACHE.data && within(CACHE.ts, TTL_MS)) {
      return RESP(200, { ok: true, cached: true, ts: new Date(CACHE.ts).toISOString(), accounts: CACHE.data });
    }

    const accounts = loadAccounts();
    const results = await Promise.all(accounts.map(fetchAccountMetrics));

    CACHE = { ts: now(), data: results };
    return RESP(200, { ok: true, cached: false, ts: new Date(CACHE.ts).toISOString(), accounts: results });
  } catch (e) {
    return RESP(500, { ok: false, error: String(e.message || e) });
  }
};