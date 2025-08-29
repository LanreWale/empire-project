// netlify/functions/debug-echo.js
"use strict";

const RESP = (code,obj)=>({statusCode:code,headers:{"Content-Type":"application/json"},body:JSON.stringify(obj)});

exports.handler = async (event) => {
  let raw = event.body || "";
  if (event.isBase64Encoded && raw) {
    try { raw = Buffer.from(raw, "base64").toString("utf8"); } catch {}
  }
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch {}
  return RESP(200, {
    ok: true,
    method: event.httpMethod,
    headers: event.headers,
    isBase64Encoded: !!event.isBase64Encoded,
    raw,
    parsed,
  });
};