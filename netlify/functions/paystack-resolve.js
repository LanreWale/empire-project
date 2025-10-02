// netlify/functions/paystack-resolve.js
// Modes:
// 1) Auto-detect (no bank_code): probe Paystack banks until one resolves
// 2) Direct resolve (with bank_code): resolve specific bank
// POST body: { accountNumber: "0123456789", bank_code?: "058" }

const axios = require("axios");

const PAYSTACK = axios.create({
  baseURL: "https://api.paystack.co",
  timeout: 10000,
  headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
});

// Tiny in-memory cache (per function instance)
const cache = new Map();
const MAX_CACHE = 1000;
const TIER1 = new Set(["058","044","011","033","232","221","057","076","082","215"]); // GTB, Access, First, UBA, Sterling, Stanbic, Zenith, Polaris, Keystone, Unity
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function setCache(key, val){
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, { ...val, ts: Date.now() });
}

async function listBanksNG(){
  const { data } = await PAYSTACK.get("/bank?country=nigeria");
  if (!data || data.status !== true) throw new Error("Failed to fetch banks");
  return data.data
    .map(b => ({ code: String(b.code||"").trim(), name: String(b.name||"").trim() }))
    .filter(b => b.code && b.name);
}

async function resolveOne(acc, bankCode){
  const { data } = await PAYSTACK.get("/bank/resolve", {
    params: { account_number: acc, bank_code: bankCode }
  });
  return (data?.status === true && data?.data?.account_name) ? data.data.account_name : null;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ ok:false, error:"Method not allowed" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const acc  = String(body.accountNumber || "").trim();
    const bank = body.bank_code ? String(body.bank_code).trim() : "";

    if (!/^\d{10}$/.test(acc)) {
      return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Invalid NUBAN (10 digits required)" }) };
    }

    // Fast cache by account only (bank-agnostic)
    const cacheKey = `NG:${acc}`;
    if (!bank && cache.has(cacheKey)) {
      return { statusCode: 200, body: JSON.stringify({ ok:true, cached:true, ...cache.get(cacheKey) }) };
    }

    // Mode 2: direct resolve (bank_code supplied)
    if (bank) {
      const name = await resolveOne(acc, bank);
      if (name) {
        return { statusCode: 200, body: JSON.stringify({ ok:true, bankCode:bank, bankName:"", accountName:name }) };
      }
      return { statusCode: 404, body: JSON.stringify({ ok:false, error:"No match for supplied bank_code" }) };
    }

    // Mode 1: auto-detect (probe)
    const banks = await listBanksNG();
    const ordered = [
      ...banks.filter(b => TIER1.has(b.code)),
      ...banks.filter(b => !TIER1.has(b.code))
    ];

    for (const b of ordered) {
      try {
        const name = await resolveOne(acc, b.code);
        if (name) {
          const result = { ok:true, bankCode:b.code, bankName:b.name, accountName:name };
          setCache(cacheKey, result);
          return { statusCode: 200, body: JSON.stringify(result) };
        }
        await sleep(120);
      } catch {
        await sleep(120);
      }
    }

    return { statusCode: 404, body: JSON.stringify({ ok:false, error:"No matching bank found" }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Server error", detail:e.message }) };
  }
};