/* Minimal helpers for Netlify JSON responses with CORS */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'Content-Type,Authorization',
};
function jsonOK(payload){ return { statusCode:200, headers:{ 'content-type':'application/json; charset=utf-8', ...CORS }, body:JSON.stringify(payload) }; }
function jsonError(message, status=200){ return { statusCode:status, headers:{ 'content-type':'application/json; charset=utf-8', ...CORS }, body:JSON.stringify({ ok:false, error:String(message) }) }; }
function preflight(){ return { statusCode:204, headers:{ ...CORS }, body:'' }; }
module.exports = { jsonOK, jsonError, preflight };
