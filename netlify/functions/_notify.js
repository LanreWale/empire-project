function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}
function optionalEnv(name, fallback) {
  return process.env[name] ?? fallback;
}

// Telegram
async function notifyTelegram(text) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const chat = optionalEnv('TELEGRAM_CHAT_VALUE') || optionalEnv('TELEGRAM_CHANNEL_USERNAME');
  if (!chat) throw new Error('No Telegram chat configured (TELEGRAM_CHAT_VALUE or TELEGRAM_CHANNEL_USERNAME)');

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chat, // numeric id (-100...) or @username
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

// WhatsApp via Twilio
async function notifyWhatsApp(toPhoneE164, text) {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const authToken  = requireEnv('TWILIO_AUTH_TOKEN');
  const fromWa     = requireEnv('TWILIO_WHATSAPP_FROM'); // e.g. +14155238886

  const to = `whatsapp:${String(toPhoneE164).replace(/^whatsapp:/, '')}`;
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

// Optional email stub (no secrets here)
async function notifyEmail(_to, _subject, _htmlOrText) {
  return { ok: true, skipped: true };
}

module.exports = {
  notifyTelegram,
  notifyWhatsApp,
  notifyEmail,
};