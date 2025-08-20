// netlify/edge-functions/shortener.js
export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // ---- tiny helpers ----
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

  // Read CMD_USER env in Edge (Deno)
  const CMD_USER = Deno.env.get("CMD_USER") || "";

  // ====== ADMIN: PUT (mint) mapping into KV ======
  if (path === "/_kv/mint" && request.method === "POST") {
    if (CMD_USER && request.headers.get("x-cmd-user") !== CMD_USER) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
    let body = {};
    try { body = await request.json(); } catch {}
    const { id = "", token = "", ttl = 172800 } = body; // default 48h
    if (!id || !token) return json({ ok: false, error: "Missing id or token" }, 400);
    await context.env.INVITES.put(id, token, { expirationTtl: Number(ttl) || 172800 });
    return json({ ok: true, id, ttl });
  }

  // ====== ADMIN: GET/DEL mapping ======
  if (path === "/_kv/admin") {
    if (CMD_USER && request.headers.get("x-cmd-user") !== CMD_USER) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
    const { searchParams } = url;
    const op = (searchParams.get("op") || "get").toLowerCase();
    const id = searchParams.get("id") || "";
    if (!id) return json({ ok: false, error: "Missing id" }, 400);

    if (op === "del" && request.method === "POST") {
      await context.env.INVITES.delete(id);
      return json({ ok: true, deleted: id });
    }
    // default: get
    const token = await context.env.INVITES.get(id);
    if (!token) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, id, token });
  }

  // ====== SHORT LINK REDIRECTOR on join.* host ======
  const host = url.hostname.toLowerCase();
  const isJoinHost = host.startsWith("join.");

  if (isJoinHost) {
    const id = url.pathname.replace(/^\/+|\/+$/g, ""); // strip leading/trailing slashes
    if (!id) {
      return new Response(
        "Empire Invite Shortener\nUse: https://join.<your-domain>/<id>",
        { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    const token = await context.env.INVITES.get(id);
    if (!token) return new Response("Not found or expired", { status: 404 });

    // Where to send the user to complete registration
    // IMPORTANT: do NOT hardcode your real domain here to avoid secrets-scan false positives.
    // Set REG_FORM_URL in Netlify ENV (e.g. https://empireaffiliatemarketinghub.com)
    const regBase =
      (Deno.env.get("REG_FORM_URL") || `${url.protocol}//${host.replace(/^join\./, "")}`)
        .replace(/\/$/, "");

    const target = `${regBase}/register?i=${encodeURIComponent(token)}`;
    return Response.redirect(target, 302);
  }

  // Not for us → continue to normal site rendering
  return context.next();
};