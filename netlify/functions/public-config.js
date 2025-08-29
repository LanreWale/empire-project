"use strict";
exports.handler = async () => {
  const tgHandle = (process.env.TELEGRAM_CHANNEL_USERNAME || "TheEmpireHq").replace(/^@/, "");
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      telegramHandle: tgHandle ? `@${tgHandle}` : "",
      telegramChannelUrl: tgHandle ? `https://t.me/${tgHandle}` : "",
      site: (process.env.URL || process.env.DEPLOY_URL || ""),
      // ❌ do not expose any GS/GAS URLs here
    }),
  };
};