// Public: proxy to Apps Script SUMMARY (no token required)
export default async function handler(req, context) {
  try {
    const direct = process.env.SHEETS_SUMMARY_URL;
    const base = process.env.SHEETS_BASE_URL;
    const url = direct || (base ? `${base}?action=summary` : null);
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: "SHEETS_* env not set" }), {
        status: 500,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }

    const r = await fetch(url, { method: "GET", headers: { "accept": "application/json" } });
    const text = await r.text();
    // Try to parse but still return text if it isn't JSON
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