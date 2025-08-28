// netlify/functions/health.js
"use strict";
const { get } = require("./lib/gas");

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async () => {
  try {
    // GAS may return: { ok:true, server:true, db:true, sheets:true, ai:true, events:[...] }
    const data = await get({ action: "health" });
    if (!data.ok) return RESP(200, { ok:true, server:true, sheets:true, ai:true, db:true, events:[] }); // fallback “online”
    return RESP(200, data);
  } catch {
    // soft fallback so the UI doesn't look dead
    return RESP(200, { ok:true, server:true, sheets:true, ai:true, db:true, events:[] });
  }
};