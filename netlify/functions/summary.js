// /summary -> proxy to Apps Script ?action=summary and normalize
export default async (req, ctx) => {
  try {
    const base = process.env.SHEETS_BASE;        // MUST be your /exec URL
    if (!base) return Response.json({ ok:false, error:"Missing SHEETS_BASE" }, { status:500 });

    const r = await fetch(`${base}?action=summary`, { headers:{ "Accept":"application/json" }});
    const data = await r.json().catch(() => ({}));

    return Response.json({
      ok: !!data.ok,
      totalEarnings: Number(data.totalEarnings || 0),
      activeUsers: Number(data.activeUsers || 0),
      approvalRate: Number(data.approvalRate || 0),
      pendingReviews: Number(data.pendingReviews || 0)
    });
  } catch (e) {
    return Response.json({ ok:false, error:String(e) }, { status:500 });
  }
};