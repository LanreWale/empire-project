// Proxy to Apps Script: returns numbers the dashboard expects (USD)
exports.handler = async () => {
  try {
    const base = process.env.GSCRIPT_WEBAPP_URL;
    if (!base) throw new Error("GSCRIPT_WEBAPP_URL not set");

    const r = await fetch(`${base}?action=summary`, { method: "GET" });
    const raw = await r.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error("Bad JSON from Apps Script"); }
    if (!r.ok || !data?.ok) throw new Error(data?.error || `Script HTTP ${r.status}`);

    const {
      totalEarnings = 0,
      activeUsers = 0,
      approvalRate = 0,
      pendingReviews = 0
    } = data;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, totalEarnings, activeUsers, approvalRate, pendingReviews })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(e) })
    };
  }
};