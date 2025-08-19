// netlify/functions/lib/http.js
exports.json = function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
};

exports.requireEnv = function requireEnv(keys = []) {
  const missing = keys.filter(k => !process.env[k] || String(process.env[k]).trim() === "");
  if (missing.length) {
    const msg = `Missing required env: ${missing.join(", ")}`;
    return { ok: false, error: msg };
  }
  return { ok: true };
};

exports.baseUrl = function baseUrl() {
  return process.env.URL || process.env.DEPLOY_URL || process.env.SITE_URL || "";
};
