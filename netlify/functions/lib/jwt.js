const crypto = require('crypto');

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