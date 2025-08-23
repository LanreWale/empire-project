// netlify/functions/me.js
"use strict";

/**
 * Returns the current user's profile for the dashboard.
 * Sources:
 *  - Token "i" (invite/session) in query or Authorization Bearer or cookie
 *  - Google Sheets (via Apps Script Web App) for scale/status
 */

const crypto = require("crypto");
const axios = require("./lib/http");

// ---------- helpers ----------
const b64u = {
  encode: (buf) => Buffer.from(buf).toString("base64url"),
  decode: (str) => Buffer.from(str, "base64url"),
};

const json = (status, body, headers = {}) => ({
  statusCode: status,
  headers: Object.assign({ "Content-Type": "application/json" }, headers),
  body: JSON.stringify(body),
});

const sign = (payloadBase64, key) =>
  crypto.createHmac("sha256", key).update(payloadBase64).digest("base64url");

function verifyToken(raw, key) {
  if (!raw || typeof raw !== "string" || !raw.includes(".")) {
    throw new Error("Missing token");
  }
  const [payloadB64, sig] = raw.split(".");
  const good = sign(payloadB64, key);
  if (sig !== good) throw new Error("Bad signature");

  let claims = {};
  try {
    claims = JSON.parse(b64u.decode(payloadB64).toString("utf8"));
  } catch (_) {
    throw new Error("Malformed claims");
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === "number" && claims.exp < now) {
    throw new Error("Token expired");
  }
  return claims;
}

function mintSession(claims, key) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24 * 30; // 30 days
  const payload = {
    v: 2,
    typ: "sess",
    iat: now,
    exp,
    sub: claims.email || claims.phone || "",
    email: claims.email || "",
    phone: claims.phone || "",
    name: claims.name || "",
  };
  const base = b64u.encode(JSON.stringify(payload));
  const sig = sign(base, key);
  return `${base}.${sig}`;
}

function parseAuth(event) {
  const q = event.queryStringParameters || {};
  if (q.i) return q.i;

  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);

  const cookie = event.headers?.cookie || "";
  const m = cookie.match(/(?:^|;\s*)empire_session=([^;]+)/);
  if (m) return m[1];

  return null;
}

async function gsFindUser({ email, phone }) {
  const GS_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL;
  if (!GS_URL) throw new Error("GOOGLE_SHEETS_WEBAPP_URL not set");

  const payload = {
    action: "findUser",
    email: String(email || ""),
    phone: String(phone || ""),
  };
  const res = await axios.post(GS_URL, payload, { timeout: 10000 });
  return res.data;
}

// ---------- handler ----------
module.exports.handler = async (event) => {
  try {
    const token = parseAuth(event);
    const KEY = process.env.INVITES_SIGNING_KEY;
    if (!KEY) return json(500, { ok: false, error: "Signing key not set" });
    if (!token) return json(401, { ok: false, error: "No token" });

    // Verify invite/session token
    const claims = verifyToken(token, KEY);

    // Query Sheet for user row (scale / status)
    const look = await gsFindUser({
      email: claims.email,
      phone: claims.phone,
    });

    if (!look || !look.ok || !look.user) {
      return json(404, { ok: false, error: "USER_NOT_FOUND" });
    }

    // Issue/refresh a 30-day session
    const session = mintSession(claims, KEY);

    // Secure cookie
    const cookie =
      `empire_session=${session}; Path=/; Max-Age=${60 * 60 * 24 * 30}; ` +
      `HttpOnly; Secure; SameSite=Lax`;

    return json(
      200,
      {
        ok: true,
        user: look.user, // {name,email,phone,scale,status,last_action_at,row}
        session,
      },
      { "Set-Cookie": cookie }
    );
  } catch (err) {
    return json(400, { ok: false, error: String(err.message || err) });
  }
};