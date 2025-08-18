function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function b64json(obj){ return base64url(JSON.stringify(obj)); }

function sign(payload, secret, expiresInSeconds) {
  const header = { alg:'HS256', typ:'JWT' };
  const now = Math.floor(Date.now()/1000);
  const body = { iat: now, exp: now + expiresInSeconds, ...payload };
  const part = `${b64json(header)}.${b64json(body)}`;
  const sig = crypto.createHmac('sha256', secret).update(part).digest('base64')
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${part}.${sig}`;
}

function verify(token, secret) {
  const [h,b,s] = token.split('.');
  if(!h||!b||!s) throw new Error('Bad token');
  const check = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64')
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  if (check !== s) throw new Error('Bad signature');
  const payload = JSON.parse(Buffer.from(b, 'base64').toString());
  const now = Math.floor(Date.now()/1000);
  if (payload.exp && now > payload.exp) throw new Error('Expired');
  return payload;
}

module.exports = { sign, verify };

netlify/functions/lib/notify.js

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