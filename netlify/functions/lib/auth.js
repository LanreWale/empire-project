// netlify/functions/lib/auth.js
"use strict";

/**
 * Checks for a Bearer token or ?key= in the request
 * and compares it to EMPIRE_TOKEN (Netlify env var).
 * Return `null` if OK, or an HTTP response object if unauthorized.
 */
const EXPECTED = (process.env.EMPIRE_TOKEN || "").trim();

exports.ensureAuth = function ensureAuth(event) {
  // Authorization: Bearer <token>
  const h = event.headers || {};
  const authHeader = h.authorization || h.Authorization || "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  const headerToken = m ? m[1] : "";

  const qsToken = event.queryStringParameters?.key || "";

  const token = headerToken || qsToken;

  if (!EXPECTED || token !== EXPECTED) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Unauthorized (key)" }),
    };
  }
  return null; // authorized
};