cat > netlify/functions/shortner.js <<'EOF'
// netlify/functions/shortner.js
// Returns a short URL that uses the Edge redirector at /i/<TOKEN>.
exports.handler = async (event) => {
  try {
    const method = event.httpMethod || "GET";

    let token =
      new URLSearchParams(event.rawQuery || event.queryStringParameters || "")
        .get("i") || "";

    if (method === "POST" && !token) {
      try {
        const body = JSON.parse(event.body || "{}");
        token = body.i || body.token || "";
      } catch {}
    }

    if (!token) return json(400, { ok: false, error: "Missing token (param 'i')" });

    const shortBase =
      process.env.SHORT_BASE_URL ||
      process.env.SHORTENER_PREFIX ||
      process.env.URL ||
      process.env.DEPLOY_URL ||
      "";

    if (!shortBase) return json(500, { ok: false, error: "SHORT_BASE_URL/URL not set" });

    const shortUrl = shortBase.replace(/\/$/, "") + "/i/" + encodeURIComponent(token);
    return json(200, { ok: true, shortUrl });
  } catch (err) {
    return json(200, { ok: false, error: err.message || String(err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
EOF