// netlify/functions/fx-rate.js
"use strict";

exports.handler = async () => {
  // Prefer canonical; keep legacy for safety; NEVER echo env names/values in errors
  const rate =
    Number(process.env.FALLBACK_USD_RATE || process.env.FX_USDNGN_FALLBACK || 0) || 0;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ usd_rate: rate > 0 ? rate : 0 }),
  };
};