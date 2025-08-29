// netlify/functions/cpa-add.js
const REQUIRED = ["name", "domain", "user", "apiKey"];

function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  // Method guard
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  // Admin secret guard (matches frontend headers(true, true))
  const admin = event.headers["x-admin-secret"] || event.headers["X-Admin-Secret"];
  if (!admin || admin.trim() === "") {
    return json(401, { ok: false, error: "Missing admin secret" });
  }

  // Parse & validate
  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const missing = REQUIRED.filter((k) => !(k in body) || String(body[k]).trim() === "");
  if (missing.length) {
    return json(400, { ok: false, error: `Missing fields: ${missing.join(", ")}` });
  }

  // Normalize fields
  const payload = {
    name: String(body.name).trim(),
    domain: String(body.domain).trim(),
    user: String(body.user).trim(),
    apiKey: String(body.apiKey).trim(),
    startingRevenue: Number(body.startingRevenue || 0) || 0,
    createdAt: new Date().toISOString(),
    actor: "cpa-add",
  };

  // Optional forward to Google Sheets / App Script webhook
  const hook = process.env.GS_WEBHOOK_URL || "";
  if (hook) {
    try {
      const res = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "CPA_ADD", data: payload }),
      });
      // We don’t fail add() just because webhook is down; we report but continue
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.warn("GS_WEBHOOK_URL failed:", res.status, txt);
      }
    } catch (e) {
      console.warn("GS_WEBHOOK_URL error:", e.message);
    }
  }

  // TODO: If you later want to persist in a DB (Fauna, Supabase, Firestore),
  // add the write here. For now we return the normalized data.
  return json(200, { ok: true, message: "CPA account recorded", payload });
};