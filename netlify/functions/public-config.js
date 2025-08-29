"use strict";

exports.handler = async () => {
  const tgHandle = (process.env.TELEGRAM_CHANNEL_USERNAME || "TheEmpireHq").replace(/^@/, "");
  const tgUrl = `https://t.me/${tgHandle}`;

  const gasUrl =
    (process.env.GAS_BRIDGE_URL ||
     process.env.GAS_WEB_APP_URL ||
     process.env.GOOGLE_SHEETS_WEBAPP_URL ||
     process.env.SHEETS_BRIDGE_URL ||
     "").trim();

  const payload = {
    telegramHandle: tgHandle ? `@${tgHandle}` : "",
    telegramChannelUrl: tgHandle ? tgUrl : "",
    gasUrl,
    site: (process.env.URL || process.env.DEPLOY_URL || ""),
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify(payload),
  };
};