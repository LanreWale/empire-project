"use strict";

exports.handler = async () => {
  const rate = Number(process.env.FX_USDNGN_FALLBACK || process.env.FALLBACK_USD_RATE || 0) || 0;
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ usd_rate: rate > 0 ? rate : 0 }),
  };
};