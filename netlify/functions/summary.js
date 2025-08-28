// netlify/functions/summary.js
"use strict";
const { corsHeaders, respond, proxyToGAS } = require("./lib/util");

module.exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(), body: "" };
  if (event.httpMethod !== "GET")     return respond(405, { ok: false, error: "Method not allowed" });
  return proxyToGAS({ summary: "1" }); // expects {ok:true, totalEarnings, activeUsers, ...}
};