// netlify/functions/approve-user.js
"use strict";

const { notifyWhatsApp, notifyTelegram } = require("./_notify.js");

const json = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim();
    const phone = String(payload.phone || "").trim();
    const approve = !!payload.approve;

    if (!name && !email && !phone) {
      return json(400, { ok: false, error: "Missing user data" });
    }

    const results = {};

    // WhatsApp notification to the user (only when approving and phone is present)
    if (approve && phone) {
      const body =
        `Hi ${name || "there"} 🎉\n` +
        `Your Empire account has been approved.\n` +
        `Email: ${email || "—"}\n` +
        `Next steps will follow shortly.`;
      results.whatsapp = await notifyWhatsApp({ to: phone, body });
    }

    // Telegram log to your channel
    const tgText =
      `✅ <b>Approval</b>\n` +
      `Name: <code>${name || "-"}</code>\n` +
      `Email: <code>${email || "-"}</code>\n` +
      `Phone: <code>${phone || "-"}</code>\n` +
      `Action: <b>${approve ? "APPROVED" : "REVIEWED"}</b>`;
    results.telegram = await notifyTelegram({ text: tgText });

    return json(200, { ok: true, name, email, phone, results });
  } catch (e) {
    return json(500, { ok: false, error: String(e) });
  }
};