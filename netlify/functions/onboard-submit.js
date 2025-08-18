const { verify } = require('./lib/jwt');
const { notifyTelegram } = require('./lib/notify');

const BRIDGE = '/.netlify/functions/gs-bridge';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };

  const SECRET = process.env.INVITE_SIGNING_KEY || '';
  if (!SECRET) return { statusCode:500, body:JSON.stringify({ ok:false, error:'Missing INVITE_SIGNING_KEY' }) };

  let payload;
  try {
    payload = JSON.parse(event.body||'{}');
  } catch {
    return { statusCode:400, body:JSON.stringify({ ok:false, error:'Invalid JSON'}) };
  }

  const { t, fullName, email, phone, telegram, notes } = payload || {};
  if (!t) return { statusCode:400, body:JSON.stringify({ ok:false, error:'Missing token'}) };

  // verify 48h token
  let tok;
  try { tok = verify(t, SECRET); }
  catch(err){ return { statusCode:401, body:JSON.stringify({ ok:false, error:'Token invalid/expired'}) }; }

  // Append to “Onboarding” sheet
  const ts = new Date().toISOString();
  const row = [ts, fullName||'', email||'', phone||'', telegram||'', 'Pending', tok.by||'', notes||''];

  const url = new URL(BRIDGE, `https://${event.headers.host}`);
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'append', sheet:'Onboarding', values: row })
  });
  const up = await res.json().catch(()=>({}));

  // Notify Commander (Telegram)
  const pretty = [
    '🔔 <b>New Onboarding Submission</b>',
    `👤 Name: ${fullName||'-'}`,
    `✉️ Email: ${email||'-'}`,
    `📱 Phone/WA: ${phone||'-'}`,
    `💬 Telegram: ${telegram||'-'}`,
    `📌 From invite by: ${tok.by||'-'}`,
    `🗒️ Notes: ${notes||'-'}`
  ].join('\n');
  await notifyTelegram(pretty).catch(()=>null);

  return {
    statusCode:200,
    headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
    body: JSON.stringify({ ok:true, upstream: up })
  };
};