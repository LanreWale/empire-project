const json = (v) => JSON.stringify(v);

async function notifyTelegram({
  text,
  chatId,                 // optional override (e.g. "-1002604...")
  botToken,               // optional override
}) {
  try {
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' };

    // Prefer numeric chat id; otherwise fall back to @username
    const target =
      chatId ||
      process.env.TELEGRAM_CHAT_VALUE ||        // e.g. "-1002604596144"
      process.env.TELEGRAM_CHANNEL_USERNAME;    // e.g. "@TheEmpireHq"

    if (!target) return { ok: false, error: 'Missing Telegram chat id/username' };

    const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;
    const body = {
      chat_id: target,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json(body),
    });

    const data = await r.json();
    if (!r.ok || !data.ok) {
      return { ok: false, status: r.status, error: json(data) };
    }
    return { ok: true, message_id: data.result?.message_id };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function notifyWhatsApp({
  to,        // E.164 number, e.g. +2348...
  body,      // message text
  from,      // optional override (e.g. "whatsapp:+14155238886")
}) {
  try {
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber =
      from || `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;

    if (!sid || !token) return { ok: false, error: 'Missing Twilio credentials' };
    if (!fromNumber)     return { ok: false, error: 'Missing TWILIO_WHATSAPP_FROM' };
    if (!to)             return { ok: false, error: 'Missing WhatsApp recipient' };

    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
      sid
    )}/Messages.json`;

    const form = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: fromNumber,
      Body: body,
    });

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = await r.json();
    if (!r.ok) {
      return { ok: false, status: r.status, error: json(data) };
    }
    return { ok: true, sid: data.sid };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

module.exports = {
  notifyTelegram,
  notifyWhatsApp,
};