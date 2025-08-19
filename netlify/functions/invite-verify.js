// netlify/functions/invite-verify.js
"use strict";
const crypto = require("crypto");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }

    const qs = event.queryStringParameters || {};
    const token = (qs.i || qs.code || "").trim();      // accept ?i= or ?code=
    if (!token) return json(200, { ok: false, error: "Missing code" });

    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return json(200, { ok: false, error: "Malformed token" });

    const key = process.env.INVITES_SIGNING_KEY || "";
    if (!key) return json(500, { ok: false, error: "Server not configured" });

    const expected = crypto.createHmac("sha256", key).update(payloadB64).digest("base64url");
    if (expected !== sigB64) return json(200, { ok: false, error: "Bad signature" });

    let claims;
    try { claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")); }
    catch { return json(200, { ok: false, error: "Invalid payload" }); }

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && now > claims.exp) return json(200, { ok: false, error: "Expired" });

    return json(200, { ok: true, claims, exp: claims.exp || null });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body),
  };
}
