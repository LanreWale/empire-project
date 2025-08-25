// netlify/functions/public-config.js
exports.handler = async () => {
  const raw = String(process.env.TELEGRAM_CHANNEL_USERNAME || "");
  const handle = raw.replace(/^@/, ""); // sanitize
  const url = handle ? `https://t.me/${handle}` : "";

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      telegramChannelUrl: url,
      telegramHandle: handle ? `@${handle}` : ""
    }),
  };
};