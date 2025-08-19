// netlify/functions/invite-created.js
"use strict";

const crypto = require("crypto");
const axios = require("axios");
const { telegram, email, whatsapp } = require("./lib/notify");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    const body = safeJSON(event.body);
    const token = (body.token || body.i || "").trim(); // support ?i= from frontend
    if (!token || !token.includes(".")) return json(400, { ok: false, error: "Missing or malformed token" });

    const INVITES_SIGNING_KEY = process.env.INVITES_SIGNING_KEY || "";
    if (!INVITES_SIGNING_KEY) return json(500, { ok: false, error: "Missing INVITES_SIGNING_KEY" });

    const [payloadB64, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", INVITES_SIGNING_KEY).update(payloadB64).digest("base64url");
    if (!timingSafeEq(sig, expected)) return json(401, { ok: false, error: "Invalid signature" });

    const claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== "number" || now > claims.exp) return json(401, { ok: false, error: "Invite expired" });

    // Merge submitted fields with claims
    const form = {
      name: body.name || claims.name || "",
      email: body.email || claims.email || "",
      phone: body.phone || claims.phone || "",
      telegramHandle: body.telegramHandle || claims.tg || "",
      notes: body.notes || "",
    };

    // Lightweight risk tags (flag, don’t block)
    const reasons = [];
    if (!form.email && !form.phone) reasons.push("no_contact");
    if ((form.name || "").length < 2) reasons.push("short_name");
    const risk = reasons.length ? `risk:${reasons.join(",")}` : "risk:none";

    // Record to Sheets
    const siteOrigin =
      process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    if (siteOrigin) {
      const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;
      axios
        .post(
          gsBridge,
          {
            action: "append",
            sheet: "Onboarding",
            values: [
              new Date().toISOString(),
              form.name,
              form.email,
              form.phone,
              form.telegramHandle,
              "submitted",
              risk,
            ],
          },
          { timeout: 10000 }
        )
        .catch(() => {});
    }

    // Notify ops
    telegram(`[ONBOARD] ${form.email || form.phone} (${risk})`).catch(() => {});
    // Acknowledge to user
    if (form.email) {
      email({
        to: form.email,
        subject: "Thanks — onboarding received",
        text:
          `Hi ${form.name || ""},\n\n` +
          `We've received your registration and will review shortly.\n` +
          `You’ll be notified on WhatsApp when approved.\n\n— Empire Team`,
      }).catch(() => {});
    }
    if (form.phone) whatsapp(form.phone, "Thanks! Your registration was received. You’ll be notified on approval.").catch(() => {});

    return json(200, { ok: true, status: "recorded", risk });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function timingSafeEq(a, b) {
  const A = Buffer.from(a || "", "utf8");
  const B = Buffer.from(b || "", "utf8");
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}
function safeJSON(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }
function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}