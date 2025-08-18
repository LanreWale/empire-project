const { sign } = require('./lib/jwt');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };

  const REG_FORM_URL = process.env.REG_FORM_URL || '';
  const SECRET = process.env.INVITE_SIGNING_KEY || '';
  if (!REG_FORM_URL || !SECRET)
    return { statusCode:500, body:JSON.stringify({ ok:false, error:'Missing REG_FORM_URL or INVITE_SIGNING_KEY' }) };

  const body = JSON.parse(event.body||'{}');
  // you can include issuer or cohort flag, etc.
  const by = (body.by || 'Commander');

  // 48 hours
  const token = sign({ by }, SECRET, 48*60*60);
  const url = `${REG_FORM_URL.replace(/\/+$/,'')}/?t=${encodeURIComponent(token)}`;

  return {
    statusCode:200,
    headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
    body: JSON.stringify({ ok:true, invite:url, expires_hours:48 })
  };
};