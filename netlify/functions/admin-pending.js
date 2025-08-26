// netlify/functions/admin-pending.js
// Approvals + WhatsApp notify (zero deps). GET lists pending; POST marks + WhatsApp.
// Telegram mirroring removed to satisfy Netlify secret scanning.

"use strict";

const RESP = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

// --- ENV
const ADMIN_SECRET = (process.env.ADMIN_SECRET || "").trim();
const PUBLIC_SITE  = (process.env.PUBLIC_SITE_ORIGIN || process.env.URL || "").replace(/\/+$/, "");
const GAS_BASE     = (process.env.GOOGLE_SHEETS_WEBAPP_URL || "").trim();
const GS_KEY       = (process.env.GS_WEBAPP_KEY || "").trim();
const GS_SHEET_ID  = (process.env.GS_SHEET_ID || "").trim();
const CC_DEFAULT   = (process.env.DEFAULT_COUNTRY_CODE || "234").replace(/^\+/, ""); // e.g., "234"

// WhatsApp gateway (generic; implemented in lib/notify.js)
const { notifyWhatsApp } = require("./lib/notify");

// --- Helpers
function ensureAdmin(event) {
  const got = event.headers?.["x-admin-secret"] || event.headers?.["X-Admin-Secret"];
  return ADMIN_SECRET && got && String(got).trim() === ADMIN_SECRET;
}

function q(url, params) {
  const u = new URL(url);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  });
  return u.toString();
}

function normalizeE164(raw) {
  if (!raw) return "";
  let s = String(raw).replace(/[^\d+]/g, "");
  if (s.startsWith("+")) return s;
  if (s.startsWith("0")) s = s.replace(/^0+/, "");
  if (!s.startsWith(CC_DEFAULT)) s = CC_DEFAULT + s;
  return "+" + s;
}

function buildWelcomeText({ name, loginUrl }) {
  const who = name ? ` ${name}` : "";
  const url = loginUrl || (PUBLIC_SITE ? `${PUBLIC_SITE}/index.html` : "/index.html");
  return [
    `⚡ *Empire Affiliate Hub*`,
    ``,
    `Hello${who}, your account has been *APPROVED*.`,
    ``,
    `Login: ${url}`,
    `Dashboard: ${PUBLIC_SITE ? PUBLIC_SITE + "/dashboard.html" : "/dashboard.html"}`,
    ``,
    `Tips:`,
    `• Stay on WhatsApp for approvals & updates`,
    `• Watch our Telegram channel for offers`,
    `• Your scale controls volume`,
  ].join("\n");
}

// --- GAS calls
async function gasListPending() {
  if (!GAS_BASE || !GS_KEY || !GS_SHEET_ID) {
    return { ok: false, error: "Missing GAS env (GOOGLE_SHEETS_WEBAPP_URL / GS_WEBAPP_KEY / GS_SHEET_ID)" };
  }
  const url = q(GAS_BASE, { action: "listPending", sheetId: GS_SHEET_ID, key: GS_KEY });
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: `GAS ${r.status}`, raw: data };
  return data; // Expect {ok:true, items:[{id,name,email,phone}]}
}

async function gasMark({ id, status }) {
  const url = q(GAS_BASE, { action: "mark", id, status, sheetId: GS_SHEET_ID, key: GS_KEY });
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: `GAS ${r.status}`, raw: data };
  return data; // Hopefully {ok:true, item:{...}}
}

async function gasGetById(id) {
  // Optional; if your GAS supports action=get
  const url = q(GAS_BASE, { action: "get", id, sheetId: GS_SHEET_ID, key: GS_KEY });
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: `GAS ${r.status}`, raw: data };
  return data;
}

// --- HTTP entry
exports.handler = async (event) => {
  try {
    if (!ensureAdmin(event)) return RESP(401, { ok: false, error: "Unauthorized" });
    if (!GAS_BASE) return RESP(500, { ok: false, error: "GOOGLE_SHEETS_WEBAPP_URL not set" });

    if (event.httpMethod === "GET") {
      const out = await gasListPending();
      return RESP(out.ok ? 200 : 502, out);
    }

    if (event.httpMethod === "POST") {
      let body = {};
      try { body = JSON.parse(event.body || "{}"); } catch {}
      const { action, id, status } = body;

      if (action !== "mark" || !id) {
        return RESP(400, { ok: false, error: "Invalid request: expect {action:'mark', id, status}" });
      }

      // 1) Mark in GAS
      const marked = await gasMark({ id, status: status || "approved" });
      if (!marked.ok) return RESP(502, marked);

      // 2) If approved → WhatsApp welcome
      if (String(status || "approved").toLowerCase() === "approved") {
        // Prefer phone/name from body; else fallback to GAS
        let phone =
          body.phone ||
          body.user?.phone ||
          marked.item?.phone ||
          marked.data?.phone ||
          "";

        let name =
          body.name ||
          body.user?.name ||
          marked.item?.name ||
          marked.data?.name ||
          "";

        if ((!phone || !name) && typeof gasGetById === "function") {
          const fetched = await gasGetById(id).catch(() => ({}));
          phone = phone || fetched?.item?.phone || "";
          name  = name  || fetched?.item?.name  || "";
        }

        const to = normalizeE164(phone);
        const loginUrl = PUBLIC_SITE ? `${PUBLIC_SITE}/index.html` : "/index.html";
        const text = buildWelcomeText({ name, loginUrl });

        let wa = { ok: false, skipped: true, reason: "no phone" };
        if (to) {
          wa = await notifyWhatsApp({ to, text });
        }

        return RESP(200, { ok: true, marked, notify: { whatsapp: wa } });
      }

      // 3) Dismissed → done
      return RESP(200, { ok: true, marked, notify: { skipped: true, reason: "not approved" } });
    }

    return RESP(405, { ok: false, error: "Method not allowed" });
  } catch (e) {
    return RESP(500, { ok: false, error: String(e) });
  }
};