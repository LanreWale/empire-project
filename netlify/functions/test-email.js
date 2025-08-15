// /netlify/functions/test-email.js
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const method = event.httpMethod || "GET";
    let subject = "Empire SMTP Test";
    let text = "This is a test email from the Empire Netlify function.";
    if (method === "POST" && event.body) {
      const body = JSON.parse(event.body || "{}");
      subject = body.subject || subject;
      text = body.text || text;
    } else if (method === "GET" && event.queryStringParameters) {
      subject = event.queryStringParameters.subject || subject;
      text = event.queryStringParameters.text || text;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM;
    const to = process.env.EMAIL_TO;

    if (!host || !port || !user || !pass || !from || !to) {
      return { statusCode: 400, body: JSON.stringify({ error: "SMTP vars missing. Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TO" }) };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({ from, to, subject, text });
    return { statusCode: 200, body: JSON.stringify({ ok: true, messageId: info.messageId }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
