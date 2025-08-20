// netlify/functions/env-dump.js
export default async function handler(req, res) {
  const safe = (key) => {
    const v = process.env[key];
    if (!v) return null;
    return v.length;
  };

  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify(
      {
        time: new Date().toISOString(),
        node: process.version,

        // Invites
        INVITES_BASE_URL: process.env.INVITES_BASE_URL,
        INVITES_SIGNING_KEY_len: safe("INVITES_SIGNING_KEY"),
        INVITE_TTL_HOURS: process.env.INVITE_TTL_HOURS,

        // Shortener
        SHORTENER_PREFIX: process.env.SHORT_BASE_URL,

        // SMTP / Email
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_FROM: process.env.SMTP_FROM,
        SMTP_USER_len: safe("SMTP_USER"),
        SMTP_PASS_len: safe("SMTP_PASS"),

        // Telegram
        TELEGRAM_BOT_TOKEN_len: safe("TELEGRAM_BOT_TOKEN"),
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        TELEGRAM_CHANNEL_USERNAME: process.env.TELEGRAM_CHANNEL_USERNAME,
        TELEGRAM_CHAT_VALUE: process.env.TELEGRAM_CHAT_VALUE,

        // Twilio / WhatsApp
        TWILIO_ACCOUNT_SID_len: safe("TWILIO_ACCOUNT_SID"),
        TWILIO_AUTH_TOKEN_len: safe("TWILIO_AUTH_TOKEN"),
        TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,

        // Google Sheets
        GOOGLE_SHEETS_PUBLIC: process.env.GOOGLE_SHEETS_PUBLIC,
        GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
        GOOGLE_SHEETS_RANGE: process.env.GOOGLE_SHEETS_RANGE,
        GOOGLE_SHEETS_WEBAPP_URL: process.env.GOOGLE_SHEETS_WEBAPP_URL,
        GS_WEBAPP_KEY_len: safe("GS_WEBAPP_KEY"),
        GS_SHEET_ID: process.env.GS_SHEET_ID,
      },
      null,
      2
    )
  );
}