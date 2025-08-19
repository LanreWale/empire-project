const crypto = require("crypto");

function b64url(buf) {
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlJson(obj) { return b64url(JSON.stringify(obj)); }

function signInvite(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const p1 = b64urlJson(header);
  const p2 = b64urlJson(payload);
  const data = `${p1}.${p2}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function verifyInvite(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [p1, p2, sig] = parts;
  const expected = b64url(crypto.createHmac("sha256", secret).update(`${p1}.${p2}`).digest());
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("Bad signature");
  }
  const payload = JSON.parse(Buffer.from(p2.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  if (typeof payload.exp === "number" && Date.now() > payload.exp) {
    throw new Error("Expired");
  }
  return payload;
}

exports.signInvite = signInvite;
exports.verifyInvite = verifyInvite;
