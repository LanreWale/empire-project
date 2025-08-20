// netlify/functions/user-set-grade.js
"use strict";
const { requireAuth, json, kvGet, kvSet, sheetsSetUserPatch } = require("./lib/auth");
const { notifyWhatsApp, notifyTelegram } = require("./_notify");

function clampScale(x) {
  const n = Math.max(1, Math.min(5, Number(x || 1)));
  return n;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Use POST" });
  }
  try {
    const commander = await requireAuth(event, { minRole: "commander" });

    const body = JSON.parse(event.body || "{}");
    const { user_id, scale, status } = body;
    if (!user_id) return json(400, { ok: false, error: "user_id required" });

    // Load current
    const key = `user:${user_id}`;
    const current = (await kvGet(key)) || {};
    const patch = {};

    if (scale !== undefined) {
      patch.scale = clampScale(scale);
    }
    if (status) {
      patch.status = status; // e.g., active / suspended
    }
    patch.updated_at = new Date().toISOString();

    const next = { ...current, ...patch };
    await kvSet(key, next);
    await sheetsSetUserPatch(user_id, patch).catch(() => { /* non-fatal */ });

    // Notify the user
    if (next.phone) {
      const msg = (scale !== undefined)
        ? `Hi ${next.name || "there"} — your account scale is now ${next.scale}×.`
        : `Hi ${next.name || "there"} — your account status is now "${next.status}".`;
      await notifyWhatsApp(next.phone, msg).catch(() => {});
    }
    // Channel audit
    await notifyTelegram(`Commander ${commander.name || commander.user_id} updated ${user_id}: ${JSON.stringify(patch)}`).catch(()=>{});

    return json(200, { ok: true, user_id, patch, by: commander.user_id });
  } catch (e) {
    const code = e.code || 401;
    return json(code, { ok: false, error: e.message || "Unauthorized" });
  }
};