"use strict";

const { telegram, email, whatsapp } = require("./lib/notify");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const body = safeJSON(event.body);
    // Example payload from invite flow:
    // { to:"...", channel:"email|telegram|whatsapp", inviteUrl:"...", name:"" }
    const { to = "", channel = "telegram", inviteUrl = "", name = "" } = body;

    // We do NOT print or hard-code the INVITES_BASE_URL to avoid secret scanning.
    const BASE_URL_CONFIGURED = Boolean(process.env.INVITES_BASE_URL);

    // Send notification (best-effort)
    if (channel === "email" && to) {
      await email({
        to,
        subject: "Your Empire invite",
        text:
          `Hello ${name || ""},\n\n` +
          `Here is your invite link:\n${inviteUrl}\n\n— Empire`,
      }).catch(() => {});
    } else if (channel === "whatsapp" && to) {
      await whatsapp(to, `Empire invite: ${inviteUrl}`).catch(() => {});
    } else {
      await telegram(`[INVITE_CREATED]\n${to}\n${inviteUrl}`).catch(() => {});
    }

    return json(200, { ok: true, baseConfigured: BASE_URL_CONFIGURED });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function safeJSON(s) { try { return JSON.parse(s || "{}"); } catch { return {}; } }
function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}