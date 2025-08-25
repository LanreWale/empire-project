// Netlify Function: /summary
export default async (req, context) => {
  try {
    const base = process.env.SHEETS_BASE; // MUST be your Apps Script /exec URL
    if (!base) return new Response(JSON.stringify({ ok:false, error:"Missing SHEETS_BASE" }), { status: 500 });

    // Ask Apps Script for the summary JSON
    const r = await fetch(`${base}?action=summary`, { headers: { "Accept": "application/json" }});
    const data = await r.json().catch(() => ({}));

    // Normalize and return
    return Response.json({
      ok: !!data.ok,
      totalEarnings: Number(data.totalEarnings || 0),
      activeUsers: Number(data.activeUsers || 0),
      approvalRate: Number(data.approvalRate || 0),
      pendingReviews: Number(data.pendingReviews || 0)
    }, { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 500 });
  }
};