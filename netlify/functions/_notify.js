// /netlify/functions/_notify.js
export async function telegramNotify(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, reason: "Telegram not configured" };
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

export async function emailNotify(subject, text) {
  // SMTP via Nodemailer; requires env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TO
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_TO;
  if (!host or not port or not user or not pass or not from or not to) {
    return { ok: false, reason: "Email not configured" };
  }
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  try {
    const info = await transporter.sendMail({ from, to, subject, text });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
