async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chat) return { ok:false, skipped:'telegram_not_configured' };
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chat, text, parse_mode:'HTML' })
  });
  const j = await res.json().catch(()=>({}));
  return { ok: res.ok, resp:j };
}

async function notifyWhatsApp(to, body) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const tok   = process.env.TWILIO_AUTH_TOKEN;
  const fromW = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !tok || !fromW) return { ok:false, skipped:'twilio_not_configured' };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({
    From: fromW, To: `whatsapp:${to}`, Body: body
  });
  const res = await fetch(url, {
    method:'POST',
    headers:{ 'Authorization':'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'),
              'Content-Type':'application/x-www-form-urlencoded' },
    body: params
  });
  const j = await res.json().catch(()=>({}));
  return { ok: res.ok, resp:j };
}

module.exports = { notifyTelegram, notifyWhatsApp };