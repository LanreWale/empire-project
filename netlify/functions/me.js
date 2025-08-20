// netlify/functions/me.js
"use strict";
const { requireAuth, json } = require("./lib/auth");

exports.handler = async (event) => {
  try {
    const me = await requireAuth(event, { minRole: "user" });
    return json(200, { ok: true, me });
  } catch (e) {
    return json(e.code || 401, { ok: false, error: e.message || "Unauthorized" });
  }
};