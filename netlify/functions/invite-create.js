"use strict";

const crypto = require("crypto");
const { telegram } = require("./lib/notify.js");

const EXPIRES_HOURS = 48;
const isValidWa = (wa) => /^\+?\d{7,15}$/.test(String(wa || ""));

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return respond(405, { error: "Method Not Allowed" });
    }

    const body = JSON.parse(event.body || "{}");
    const wa = String(body.whatsappNumber || "").trim();

    if (!isValidWa(wa)) {
      return respond(400, { error: "Invalid WhatsApp number" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = Date.now() + EXPIRES_HOURS * 3600 * 1000;

    const base = "https://luxury-puffpuff-0442f0.netlify.app/invite.html";
    const u = new URL(base);
    u.searchParams.set("wa", wa);
    u.searchParams.set("t", token);

    // TODO: persist { token, wa, expiresAt } in DB if you need server-side validation later.

    // Non-blocking notification
    telegram(`Invite created\nWA: ${wa}\nExpiry: ${EXPIRES_HOURS}h\nURL: ${u.toString()}`).catch(() => {});

    return respond(200, { ok: true, link: u.toString(), token, expiresAt });
  } catch (err) {
    return respond(500, { error: err.message || "Internal Error" });
  }
};

function respond(statusCode, data) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify(data),
  };
}
