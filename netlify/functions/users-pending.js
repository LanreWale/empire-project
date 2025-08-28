// netlify/functions/users-pending.js
"use strict";
const { get } = require("./lib/gas");

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async () => {
  try {
    // GAS should return: { ok:true, users:[{id,name,email,phone,...}] }
    const data = await get({ action: "usersPending" });
    if (!data.ok) return RESP(502, data);
    return RESP(200, data);
  } catch (e) {
    return RESP(500, { ok: false, error: String(e) });
  }
};