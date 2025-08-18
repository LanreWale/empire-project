// HMAC sign/verify for invite tokens
const crypto = require("crypto");

const KEY = process.env.INVITE_SIGNING_KEY || "changeme-supersecret";
const TTL_HOURS = parseInt(process.env.INVITE_TTL_HOURS || "48", 10);

function sign(payloadObj) {
  const payload = {
    ...payloadObj,
    iat: Date.now(),
    exp: Date.now() + TTL_HOURS * 3600 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", KEY).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || !token.includes(".")) return { ok: false, error: "Bad token" };
  const [body, sig] = token.split(".");
  const expect = crypto.createHmac("sha256", KEY).update(body).digest("base64url");
  if (expect !== sig) return { ok: false, error: "Bad signature" };
  const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (Date.now() > data.exp) return { ok: false, error: "Expired" };
  return { ok: true, data };
}

module.exports = { sign, verify };
