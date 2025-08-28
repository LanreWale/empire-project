// netlify/functions/summary.js
"use strict";
const { get } = require("./lib/gas");

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async () => {
  try {
    // Your GAS should handle action=summary and return:
    // { ok:true, totalEarnings, activeUsers, approvalRate, pendingReviews, monthly[], geo[], live[] }
    const data = await get({ action: "summary" });
    if (!data.ok) return RESP(502, data);
    return RESP(200, data);
  } catch (e) {
    return RESP(500, { ok: false, error: String(e) });
  }
};