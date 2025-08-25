// Public: proxy to Apps Script EVENTS (no token required)
export default async function handler(req, context) {
  try {
    const direct = process.env.SHEETS_EVENTS_URL;
    const base = process.env.SHEETS_BASE_URL;

    // forward simple filters
    const u = new URL(req.url);
    const limit = u.searchParams.get("limit") || "";
    const since = u.searchParams.get("since") || "";

    let url = direct || (base ? `${base}?action=events` : null);
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: "SHEETS_* env not set" }), {
        status: 500,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }
    // attach optional params
    const qs = new URL(url);
    if (limit) qs.searchParams.set("limit", limit);
    if (since) qs.searchParams.set("since", since);
    url = qs.toString();

    const r = await fetch(url, { method: "GET", headers: { "accept": "application/json" } });
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { ok: true, raw: text }; }

    return new Response(JSON.stringify(body), {
      status: r.ok ? 200 : r.status,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }
}