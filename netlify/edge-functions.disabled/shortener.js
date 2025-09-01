// netlify/edge-functions/shortener.js
// Edge Function: short link redirect -> <BASE>/login?i=<token>[&ref=...]
// Notes:
// - BASE resolves in priority: INVITES_BASE_URL -> URL/DEPLOY_URL -> request origin
// - Only allows safe tokens: [A-Za-z0-9_-]{3,128}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const NO_STORE = { "cache-control": "no-store, no-cache, must-revalidate" };

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...NO_STORE } });
}

function badRequest(msg) {
  return json(400, { ok: false, error: msg });
}

export default async (request) => {
  try {
    const url = new URL(request.url);

    // Only match /i/<token> (optional trailing slash)
    const match = url.pathname.match(/^\/i\/([^/]+)\/?$/);
    if (!match) {
      return json(404, { ok: false, error: "Not a short link" });
    }

    const token = match[1];

    // Strict token guard (avoid odd encodings / slashes / path traversal)
    // Allow base64url/slug-like safe charset
    if (!/^[A-Za-z0-9_-]{3,128}$/.test(token)) {
      return badRequest("Invalid token");
    }

    // Resolve base URL at runtime
    const envGet =
      (typeof Netlify !== "undefined" && Netlify.env?.get?.bind(Netlify.env)) ||
      ((k) => (globalThis.Deno?.env ? Deno.env.get(k) : undefined));

    const baseFromEnv =
      envGet?.("INVITES_BASE_URL") ||
      envGet?.("URL") ||
      envGet?.("DEPLOY_URL") ||
      "";

    // Prefer configured base; fall back to request origin if needed
    const baseOrigin = baseFromEnv || `${url.protocol}//${url.host}`;

    // Build destination: <base>/login?i=<token>
    const dest = new URL(baseOrigin.replace(/\/$/, "") + "/login");
    dest.searchParams.set("i", token);

    // Optional passthrough: ?ref=, ?utm_* from the short URL
    const passthroughKeys = ["ref", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    for (const k of passthroughKeys) {
      const v = url.searchParams.get(k);
      if (v) dest.searchParams.set(k, v);
    }

    // 302 (temporary) so future token changes don't get cached aggressively
    return Response.redirect(dest.toString(), 302, {
      headers: {
        // Prevent edge/CDN overcaching the redirect target
        ...NO_STORE,
      },
    });
  } catch (err) {
    return json(500, { ok: false, error: String(err) });
  }
};