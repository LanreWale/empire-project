export default async (req, context) => {
  try {
    const base = process.env.SHEETS_BASE;
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 20)));

    const r = await fetch(`${base}?action=events&limit=${limit}`, { headers: { "Accept":"application/json" }});
    const data = await r.json().catch(() => ({}));

    return Response.json({ ok: !!data.ok, events: data.events || [] });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 500 });
  }
};