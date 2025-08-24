"use strict";

exports.handler = async () => {
  const tg = (process.env.TELEGRAM_CHANNEL_USERNAME || "TheEmpireHq").replace(/^@/, "");
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    body: JSON.stringify({ telegramChannel: tg })
  };
};