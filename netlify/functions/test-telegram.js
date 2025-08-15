// /netlify/functions/test-telegram.js
const axios = require("axios");

exports.handler = async (event) => {
  try {
    let text = "Empire Telegram test message";
    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body || "{}");
      text = body.text || text;
    } else if (event.httpMethod === "GET" && event.queryStringParameters) {
      text = event.queryStringParameters.text || text;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID" }) };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await axios.post(url, { chat_id: chatId, text });
    return { statusCode: 200, body: JSON.stringify({ ok: true, result: res.data }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
