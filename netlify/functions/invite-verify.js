const ok = (b)=>({ statusCode:200, headers:{ "Content-Type":"application/json" }, body:JSON.stringify(b) });
const bad = (c,m)=>({ statusCode:c, headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ ok:false, error:m }) });

export const handler = async (event) => {
  try {
    const code = (event.queryStringParameters?.code || "").trim();
    if (!code) return bad(400, "Missing code");

    const qs = new URLSearchParams({
      action: "get",
      key: process.env.GS_WEBAPP_KEY,
      sheet: "Invites"
    });
    const url = `${process.env.GOOGLE_SHEETS_WEBAPP_URL}?${qs.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.values)) return bad(500, "Upstream error");

    // [InviteCode, CreatedAt, ExpiresAt, UsedBy, Status]
    const row = data.values.find((r) => r[0] === code);
    if (!row) return ok({ ok:true, valid:false, reason:"not_found" });

    const [, , expiresISO, usedBy, status] = row;
    const expired = Date.now() > Date.parse(expiresISO || "");
    const used = !!(usedBy && usedBy.length);
    const valid = !expired && !used && status === "active";

    return ok({ ok:true, valid, expired, used, status, expires: expiresISO });
  } catch (e) {
    return bad(500, String(e));
  }
};