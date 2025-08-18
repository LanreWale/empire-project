const ok = (b)=>({ statusCode:200, headers:{ "Content-Type":"application/json" }, body:JSON.stringify(b) });
const bad = (c,m)=>({ statusCode:c, headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ ok:false, error:m }) });

async function appendRow(sheet, values){
  const qs = new URLSearchParams({
    action: "append",
    key: process.env.GS_WEBAPP_KEY,
    sheet,
    values: JSON.stringify(values)
  });
  const res = await fetch(`${process.env.GOOGLE_SHEETS_WEBAPP_URL}?${qs.toString()}`);
  return res.json();
}

async function notifyCommander(payload){
  try {
    if (process.env.TG_BOT_TOKEN && process.env.TG_CHAT_ID) {
      const text = `🆕 New registration\nName: ${payload.name}\nEmail: ${payload.email}\nTG: ${payload.telegram}\nWA: ${payload.whatsapp}`;
      await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ chat_id: process.env.TG_CHAT_ID, text })
      });
    }
    if (process.env.SENDGRID_API_KEY && process.env.ALERT_EMAIL_TO && process.env.ALERT_EMAIL_FROM) {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method:"POST",
        headers:{
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          personalizations:[{ to:[{ email: process.env.ALERT_EMAIL_TO }] }],
          from:{ email: process.env.ALERT_EMAIL_FROM, name:"Empire Bot" },
          subject:"New Empire Registration",
          content:[{ type:"text/plain", value: JSON.stringify(payload, null, 2) }]
        })
      });
    }
  } catch {}
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return bad(405, "Use POST");
    const body = JSON.parse(event.body || "{}");
    const { name, email, telegram, whatsapp, password, invite } = body;
    if (!invite || !email || !name) return bad(400, "Missing required fields");

    const verifyURL = `${process.env.URL}/.netlify/functions/invite-verify?code=${encodeURIComponent(invite)}`;
    const v = await (await fetch(verifyURL)).json();
    if (!v.ok || !v.valid) return bad(400, `Invalid invite`);

    const now = new Date().toISOString();
    const row = [now, name, email, telegram || "", whatsapp || "", password || "", "pending", invite];
    const ap = await appendRow("Onboarding", row);
    if (!ap.ok) return bad(500, `Upstream append failed`);

    const qs = new URLSearchParams({
      action: "consumeInvite",
      key: process.env.GS_WEBAPP_KEY,
      code: invite,
      usedBy: email
    });
    await fetch(`${process.env.GOOGLE_SHEETS_WEBAPP_URL}?${qs.toString()}`);

    await notifyCommander({ name, email, telegram, whatsapp });

    return ok({ ok:true, message:"Registered. Await approval." });
  } catch (e) {
    return bad(500, String(e));
  }
};