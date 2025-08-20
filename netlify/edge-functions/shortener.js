// netlify/edge-functions/shortener.js
export default async (request) => {
  try {
    const url = new URL(request.url);
    // Match /i/<token> (optional trailing slash)
    const match = url.pathname.match(/^\/i\/([^/]+)\/?$/);

    if (!match) {
      // Not our route—return a clean 404 JSON (no context.next())
      return new Response(
        JSON.stringify({ ok: false, error: "Not a short link" }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    const token = match[1];

    // Read the base URL at runtime (no hard-coding)
    const base =
      (typeof Netlify !== "undefined" && Netlify.env?.get?.("INVITES_BASE_URL")) ||
      Deno.env.get("INVITES_BASE_URL") ||
      "";

    if (!base) {
      return new Response(
        JSON.stringify({ ok: false, error: "INVITES_BASE_URL not set" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    // Build destination: <base>/login?i=<token>
    const dest = new URL(base.replace(/\/$/, "") + "/login");
    dest.searchParams.set("i", token);

    // Redirect to invite/login screen
    return Response.redirect(dest.toString(), 302);
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};