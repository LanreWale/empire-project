const fetch = global.fetch || (await import('node-fetch')).default;

// Helper: read env safely without ever logging secret values
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}
function optionalEnv(name, fallback = undefined) {
  return process.env[name] ?? fallback;
}

/** Send a Telegram message to a channel/group/user.
 * Prefers TELEGRAM_CHAT_VALUE (numeric id like -100xxxxxxxxxx),
 * else falls back to TELEGRAM_CHANNEL_USERNAME (e.g. @TheEmpireHq).
 */
async function notifyTelegram(text) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');

  // Prefer numeric chat id; fall back to @username
  const chat = optionalEnv('TELEGRAM_CHAT_VALUE') || optionalEnv('TELEGRAM_CHANNEL_USERNAME');
  if (!chat) throw new Error('No Telegram chat configured (TELEGRAM_CHAT_VALUE or TELEGRAM_CHANNEL_USERNAME)');

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chat, // can be -100… or @username
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    return { ok: false, status: res.status, error: JSON.stringify(data) };
  }
  return { ok: true, message_id: data.result?.message_id };
}

/** Send a WhatsApp message via Twilio */
async function notifyWhatsApp(toPhoneE164, text) {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const authToken  = requireEnv('TWILIO_AUTH_TOKEN');
  const fromWa    = requireEnv('TWILIO_WHATSAPP_FROM'); // e.g. +14155238886

  const to = `whatsapp:${toPhoneE164.replace(/^whatsapp:/, '')}`;
  const from = `whatsapp:${fromWa}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: text });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: JSON.stringify(data) };
  }
  return { ok: true, sid: data.sid };
}

/** (Optional) Email helper via SMTP (left unchanged if you already have one)
 * Export a stub that always resolves if you don't need email right now.
 */
async function notifyEmail(_to, _subject, _htmlOrText) {
  // Implement if needed with nodemailer without hardcoded secrets
  return { ok: true, skipped: true };
}

module.exports = {
  notifyTelegram,
  notifyWhatsApp,
  notifyEmail,
};