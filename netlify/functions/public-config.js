// netlify/functions/public-config.js
"use strict";

exports.handler = async () => {
  const tgHandle = (process.env.TELEGRAM_CHANNEL_USERNAME || "TheEmpireHq").replace(/^@/, "");
  const tgUrl = `https://t.me/${tgHandle}`;

  // Use ONLY the new GS_* family
  const gasUrl = (process.env.GS_WEBHOOK_URL || process.env.GS_WEBAPP_URL || "").trim();

  // Safe values to expose to browser
  const payload = {
    telegramHandle: tgHandle ? `@${tgHandle}` : "",
    telegramChannelUrl: tgHandle ? tgUrl : "",
    gasUrl,  // used by dashboard bootstrap fallback
    hasSheet: !!process.env.GS_SHEET_ID,
    site: (process.env.URL || process.env.DEPLOY_URL || ""),
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify(payload),
  };
};