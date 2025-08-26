// Proxy to Apps Script: events feed (public)
exports.handler = async (event) => {
  const q = event?.queryStringParameters || {};
  const limit = Math.max(1, Math.min(200, parseInt(q.limit || "50", 10)));

  try {
    const base = process.env.GSCRIPT_WEBAPP_URL;
    if (!base) throw new Error("GSCRIPT_WEBAPP_URL not set");

    const r = await fetch(`${base}?action=events&limit=${limit}`, { method: "GET" });
    const raw = await r.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error("Bad JSON from Apps Script"); }
    if (!r.ok || !data?.ok) throw new Error(data?.error || `Script HTTP ${r.status}`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, events: data.events || [] })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(e) })
    };
  }
};