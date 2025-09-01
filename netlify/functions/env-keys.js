import { preflight, json } from './_util.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight(event);
  const visible = [
    'SHEETS_BASE_URL',
    'GS_WEBAPP_KEY',
    'SHEETS_SUMMARY_URL',   // legacy friendly
    'SHEETS_OFFERS_URL',
    'SHEETS_USERS_URL',
    'SHEETS_EVENTS_URL',
    'SHEETS_WALLET_URL',
    'SMTP_HOST', 'SMTP_USER', 'SMTP_FROM',
    'TELEGRAM_BOT_TOKEN',
    'TWILIO_ACCOUNT_SID', 'TWILIO_WHATSAPP_FROM'
  ].filter((k) => process.env[k]);

  return json({ ok: true, envVisible: visible, buildTime: new Date().toISOString() });
};
