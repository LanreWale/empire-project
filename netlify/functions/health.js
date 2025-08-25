"use strict";

exports.handler = async () => {
  const out = { ok:true, server:"ONLINE", db:"UNKNOWN", sheets:"UNKNOWN", ai:"UNKNOWN" };

  try {
    const base = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
    const key  = process.env.GS_WEBAPP_KEY || "";
    if (base && key) {
      const r = await fetch(`${base}?action=poke&key=${encodeURIComponent(key)}`);
      out.sheets = r.ok ? "OPERATIONAL" : "DOWN";
    } else {
      out.sheets = "UNCONFIGURED";
    }
  } catch { out.sheets = "DOWN"; }

  // Optional: quick Paystack ping via banks endpoint
  try {
    const k = (process.env.PAYSTACK_SECRET_KEY || "").trim();
    if (k) {
      const r = await fetch("https://api.paystack.co/bank?country=nigeria", {
        headers: { Authorization: `Bearer ${k}` }
      });
      out.db = r.ok ? "OPERATIONAL" : "DEGRADED";
    } else {
      out.db = "UNCONFIGURED";
    }
  } catch { out.db = "DEGRADED"; }

  // Optional AI flag – set ACTIVE if you use it
  out.ai = "ACTIVE";

  return { statusCode:200, headers:{ "content-type":"application/json" }, body: JSON.stringify(out) };
};