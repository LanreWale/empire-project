// /events?limit=20 -> proxy to Apps Script ?action=events&limit=...
export default async (req, ctx) => {
  try {
    const base = process.env.SHEETS_BASE;
    if (!base) return Response.json({ ok:false, error:"Missing SHEETS_BASE" }, { status:500 });

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 20)));

    const r = await fetch(`${base}?action=events&limit=${limit}`, { headers:{ "Accept":"application/json" }});
    const data = await r.json().catch(() => ({}));

    return Response.json({ ok: !!data.ok, events: Array.isArray(data.events) ? data.events : [] });
  } catch (e) {
    return Response.json({ ok:false, error:String(e) }, { status:500 });
  }
};