const nodemailer = require("nodemailer");

function asBool(v, d=false){ if(v==null)return d; const s=String(v).trim().toLowerCase(); return s==="true"||s==="1"||s==="yes"; }

exports.handler = async (event) => {
  // No toUpperCase anywhere
  if (!event || (event.httpMethod||"") !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Use POST" }) };
  }

  // Safe JSON parse
  let body = {};
  try { body = JSON.parse(event.body||"{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  // Normalize inputs
  let { to, subject, text, html, replyTo } = body;
  if (Array.isArray(to)) to = to.filter(Boolean).join(",");
  if (typeof to !== "string" || !to.includes("@")) return { statusCode: 400, body: JSON.stringify({ error: "Field 'to' must be an email or array" }) };
  if (!subject || typeof subject !== "string" || !subject.trim()) return { statusCode: 400, body: JSON.stringify({ error: "Field 'subject' is required" }) };
  if (!text && !html) return { statusCode: 400, body: JSON.stringify({ error: "Provide 'text' or 'html'" }) };

  // Env
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE } = process.env;
  const from = (SMTP_FROM && SMTP_FROM.trim()) || SMTP_USER;
  const port = Number(SMTP_PORT || 587);
  const secure = asBool(SMTP_SECURE, false); // false for 587 (STARTTLS)

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return { statusCode: 500, body: JSON.stringify({
      error: "SMTP env vars missing",
      envCheck: { host: !!SMTP_HOST, port: !!SMTP_PORT, user: !!SMTP_USER, pass: !!SMTP_PASS, from }
    })};
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST, port, secure, auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    const info = await transporter.sendMail({
      from, to, subject,
      text: text ? String(text) : undefined,
      html: html ? String(html) : undefined,
      replyTo: replyTo || from
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, messageId: info.messageId, accepted: info.accepted }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({
      ok: false, message: err?.message || String(err),
      envCheck: { host: !!SMTP_HOST, port, user: !!SMTP_USER, pass: !!SMTP_PASS, from, secure }
    })};
  }
};
