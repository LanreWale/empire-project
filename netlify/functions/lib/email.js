const nodemailer = require("nodemailer");

function flag(v, d=false){ if(v==null)return d; const s=String(v).toLowerCase(); return s==="true"||s==="1"; }

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT||"587",10),
  secure: flag(process.env.SMTP_SECURE, false),  // false for 587 (STARTTLS)
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendEmail({ to, subject, html, text, replyTo }) {
  const from = (process.env.SMTP_FROM || process.env.SMTP_USER).trim();
  const info = await transporter.sendMail({ from, to, subject, html, text, replyTo: replyTo || from });
  return info.messageId;
}

module.exports = { sendEmail };
