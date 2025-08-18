import crypto from "crypto";

const ok = (b)=>({ statusCode:200, headers:{ "Content-Type":"application/json" }, body:JSON.stringify(b) });
const bad = (c,m)=>({ statusCode:c, headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ ok:false, error:m }) });

export const handler = async (event) => {
  try {
    const who = event.headers["x-cmd-user"] || "";
    const token = event.headers["x-cmd-token"] || "";
    if (who !== process.env.CMD_USER || token !== process.env.CMD_TOKEN) {
      return bad(401, "Unauthorized");
    }

    const code = crypto.randomBytes(4).toString("hex"); // 8 chars
    const now = new Date();
    const expires = new Date(now.getTime() + 48 * 3600 * 1000);

    const qs = new URLSearchParams({
      action: "append",
      key: process.env.GS_WEBAPP_KEY,
      sheet: "Invites",
      values: JSON.stringify([ code, now.toISOString(), expires.toISOString(), "", "active" ])
    });

    const url = `${process.env.GOOGLE_SHEETS_WEBAPP_URL}?${qs.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) return bad(500, `Upstream: ${data.error || "unknown"}`);

    const inviteLink = `https://enchanting-tiramisu-e8c254.netlify.app/register?invite=${code}`;
    return ok({ ok:true, inviteLink, code, expires: expires.toISOString() });
  } catch (e) {
    return bad(500, String(e));
  }
};