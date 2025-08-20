const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM,
        TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_VALUE } = process.env;

function json(status, body) {
  return { statusCode: status, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

function readInput(event) {
  if (event.httpMethod === "GET") {
    const p = event.queryStringParameters || {};
    return {
      name: p.name, email: p.email, phone: p.phone,
      approve: String(p.approve || p.status || "").toLowerCase() === "true" || String(p.status).toLowerCase() === "approved"
    };
  }
  try { return JSON.parse(event.body || "{}"); } catch { return {}; }
}

async function sendWhatsApp({ to, body }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return { ok: false, skipped: true, reason: "Twilio env missing" };
  }
  if (!/^\+?\d{8,15}$/.test(String(to || ""))) {
    return { ok: false, error: "Invalid phone number" };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({
    From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
    To: `whatsapp:${to}`,
    Body: body
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, status: res.status, error: txt.slice(0, 400) };
    }
  const data = await res.json();
  return { ok: true, sid: data.sid };
}

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_VALUE) {
    return { ok: false, skipped: true, reason: "Telegram env missing" };
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_VALUE, text, parse_mode: "HTML", disable_web_page_preview: true })
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  return { ok: true };
}

exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) return json(405, { ok: false, error: "Method Not Allowed" });

  const { name, email, phone, approve } = readInput(event);
  if (!approve) return json(400, { ok: false, error: "Set approve:true" });
  if (!phone) return json(400, { ok: false, error: "Missing phone" });

  const loginUrl = "https://empireaffiliatemarketinghub.com/login";
  const who = name || email || phone;

  const waBody =
`Hello ${who}, 🎉
Your Empire Affiliate Marketing Hub account has been APPROVED.

Login: ${loginUrl}

Support: @TheEmpireHq`;

  const whatsapp = await sendWhatsApp({ to: phone, body: waBody }).catch(e => ({ ok: false, error: e.message }));
  const telegram = await sendTelegram(`✅ Approved <b>${who}</b> (${phone})`).catch(e => ({ ok: false, error: e.message }));

  const ok = (whatsapp.ok || whatsapp.skipped) && (telegram.ok || telegram.skipped);
  return json(ok ? 200 : 207, { ok, phone, name, email, results: { whatsapp, telegram } });
};