export default async (request, context) => {
  try {
    const url = new URL(request.url);

    // Match paths like /i/<token>  (ignore trailing slash)
    // e.g. /i/abc.def -> token = "abc.def"
    const match = url.pathname.match(/^\/i\/([^/]+)\/?$/);
    if (!match) {
      // Not our route; let other assets/functions handle this request
      return context.next();
    }

    const token = match[1];

    // Read base URL at runtime (don’t hardcode)
    // Prefer SHORT_BASE_URL (if you want the redirect to live on a different domain),
    // otherwise fall back to INVITES_BASE_URL.
    const base =
      (Netlify?.env?.get && Netlify.env.get("INVITES_BASE_URL")) ||
      Deno.env.get("INVITES_BASE_URL") ||
      "";

    if (!base) {
      return new Response(
        JSON.stringify({ ok: false, error: "INVITES_BASE_URL not set" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Build destination: <base>/login?i=<token>
    const dest = new URL(base.replace(/\/$/, "") + "/login");
    dest.searchParams.set("i", token);

    // 302 to the invite/login screen
    return Response.redirect(dest.toString(), 302);
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};