const axios = require("axios");
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const { type, success, data, error } = JSON.parse(event.body);

    const message = success
      ? `✅ Empire Alert: ${type.toUpperCase()} succeeded\n${JSON.stringify(data, null, 2)}`
      : `❌ Empire Alert: ${type.toUpperCase()} failed\nError: ${error}`;

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const tgUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      await axios.post(tgUrl, {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message
      });
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO,
        subject: `Empire Alert: ${type}`,
        text: message
      });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};