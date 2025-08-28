// netlify/functions/wallet.js
"use strict";
const { get } = require("./lib/gas");

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  try {
    const limit = Math.max(1, Math.min(500, parseInt(event.queryStringParameters?.limit || "50", 10) || 50));
    // GAS should return: { ok:true, available/balance, withdraw, processing, items:[{date,amount,method,status}] }
    const data = await get({ action: "wallet", limit });
    if (!data.ok) return RESP(502, data);
    return RESP(200, data);
  } catch (e) {
    return RESP(500, { ok: false, error: String(e) });
  }
};