const nodemailer = require("nodemailer");

/** Netlify function: POST body = { to, subject, text?, html? } */
exports.handler = async (event) => {
  try {
    if ((event.httpMethod || "").toUpperCase() !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    // Read env safely with defaults (no toUpperCase on undefined)
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
    let { to, subject, text, html, replyTo } = payload;

    if (Array.isArray(to)) to = to.filter(Boolean).join(",");
    if (typeof to !== "string" || !to.includes("@")) {
      return { statusCode: 400, body: JSON.stringify({ error: "Field 'to' must be an email or array" }) };
    }
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: "Field 'subject' is required" }) };
    }
    if (!text && !html) {
      return { statusCode: 400, body: JSON.stringify({ error: "Provide 'text' or 'html'" }) };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || from,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, messageId: info.messageId }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: err?.message || String(err),
      }),
    };
  }
};
