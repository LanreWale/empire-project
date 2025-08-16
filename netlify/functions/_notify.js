const nodemailer = require("nodemailer");

/** Netlify function: POST body = { to, subject, text?, html? } */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const payload = JSON.parse(event.body || "{}");

    // Read env safely with defaults and NO toUpperCase() on undefined
    const host = String(process.env.SMTP_HOST || "").trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const user = String(process.env.SMTP_USER || "").trim();
    const pass = String(process.env.SMTP_PASS || "").trim();
    const from = String(process.env.SMTP_FROM || user || "").trim();
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

    // Validate required env
    const missing = [];
    if (!host) missing.push("SMTP_HOST");
    if (!user) missing.push("SMTP_USER");
    if (!pass) missing.push("SMTP_PASS");
    if (!from) missing.push("SMTP_FROM (or SMTP_USER)");
    if (missing.length) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing required SMTP environment variables",
          missing,
        }),
      };
    }

    // Validate request
    if (!payload.to) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing "to" in request body' }) };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject || "No subject",
      text: payload.text,
      html: payload.html,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, messageId: info.messageId }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message, stack: err.stack }),
    };
  }
};
