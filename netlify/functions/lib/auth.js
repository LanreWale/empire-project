// netlify/functions/lib/auth.js
"use strict";

const crypto = require("crypto");
const axios = require("axios");

const COOKIE_NAME = "empire_session";
const SIGNING_KEY = process.env.INVITES_SIGNING_KEY || "dev-key";

function base64url(buf) {
  return Buffer.from(buf).toString("base64url");
}
function signHS256(header, payload) {
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", SIGNING_KEY).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verifyHS256(token) {
  const [h, p, s] = (token || "").split(".");
  if (!h || !p || !s) throw new Error("Bad token");
  const data = `${h}.${p}`;
  const expect = crypto.createHmac("sha256", SIGNING_KEY).update(data).digest("base64url");
  if (expect !== s) throw new Error("Bad signature");
  return JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
}

function cookieGet(event) {
  const raw = (event.headers?.cookie || event.headers?.Cookie || "").split(/;\s*/);
  const m = raw.find(v => v.startsWith(`${COOKIE_NAME}=`));
  return m ? decodeURIComponent(m.split("=")[1]) : "";
}

function json(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// ---- KV helpers (Netlify KV Beta style) ----
async function kvGet(key) {
  // Netlify runtime exposes global KV bindings if configured as env "EMPIRE_KV" / similar.
  // Fallback to noop memory (dev).
  const store = globalThis.EMPIRE_KV || globalThis.kv || null;
  if (store?.get) return await store.get(key, { type: "json" });
  return null;
}
async function kvSet(key, value) {
  const store = globalThis.EMPIRE_KV || globalThis.kv || null;
  if (store?.set) return await store.set(key, value);
  return null;
}

// ---- Sheets bridge ----
const GS_WEBAPP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
async function sheetsGetUser(user_id) {
  if (!GS_WEBAPP_URL) return null;
  const url = `${GS_WEBAPP_URL}?mode=getUser&user_id=${encodeURIComponent(user_id)}`;
  const { data } = await axios.get(url, { timeout: 8000 });
  return data?.user || null;
}
async function sheetsSetUserPatch(user_id, patch) {
  if (!GS_WEBAPP_URL) return null;
  const payload = { mode: "patchUser", user_id, patch };
  const { data } = await axios.post(GS_WEBAPP_URL, payload, { timeout: 8000 });
  return data?.ok;
}

// ---- Auth guard ----
async function requireAuth(event, { minRole = "user" } = {}) {
  try {
    const token = cookieGet(event);
    const sess = verifyHS256(token);
    const userKV = await kvGet(`user:${sess.user_id}`);
    const user = userKV || (await sheetsGetUser(sess.user_id)) || sess;

    if (!user || user.status === "suspended") throw new Error("Not allowed");

    const rank = r => (r === "commander" ? 2 : 1);
    if (rank(user.role) < rank(minRole)) throw new Error("Insufficient role");

    return user; // { user_id, role, scale, ... }
  } catch (e) {
    throw Object.assign(new Error("Unauthorized"), { code: 401 });
  }
}

module.exports = {
  COOKIE_NAME,
  signHS256,
  verifyHS256,
  json,
  kvGet,
  kvSet,
  sheetsGetUser,
  sheetsSetUserPatch,
  requireAuth,
};