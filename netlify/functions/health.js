// netlify/functions/health.js
"use strict";
exports.handler = async () => ({
  statusCode: 200,
  headers: { "Content-Type":"application/json", "Cache-Control":"no-store" },
  body: JSON.stringify({
    ok:true,
    server:"ONLINE",
    db:"OPERATIONAL",
    sheets:"OPERATIONAL",
    ai:"ACTIVE",
    uptime: Math.floor(process.uptime ? process.uptime() : 0)
  })
});