const { notifyTelegram, notifyWhatsApp, notifyEmail } = require('./_notify.js');

exports.handler = async (event) => {
  try {
    const isJson = event.headers['content-type']?.includes('application/json');
    const payload = isJson ? JSON.parse(event.body || '{}') : {};
    const { name, email, phone, approve } = payload;

    if (!name || !email || !phone) {
      return json(400, { ok: false, error: 'Missing name/email/phone' });
    }

    const statusText = approve ? 'APPROVED' : 'REVIEWED';
    const msg = [
      `✅ <b>Empire Onboarding ${statusText}</b>`,
      '',
      `<b>Name:</b> ${escapeHtml(name)}`,
      `<b>Email:</b> ${escapeHtml(email)}`,
      `<b>Phone:</b> ${escapeHtml(phone)}`,
      '',
      `Welcome to <b>The Empire</b>.`,
    ].join('\n');

    // Fan-out notifications
    const [waRes, tgRes, emRes] = await Promise.allSettled([
      notifyWhatsApp(phone, `Empire ${statusText}: ${name}\nWelcome to The Empire.`),
      notifyTelegram(msg),
      notifyEmail(email, `Empire ${statusText}`, `Hello ${name}, your account is ${statusText}.`),
    ]);

    const results = {
      whatsapp: settle(waRes),
      telegram: settle(tgRes),
      email: settle(emRes),
    };

    return json(200, { ok: true, name, email, phone, results });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
function settle(p) {
  return p.status === 'fulfilled' ? p.value : { ok: false, error: p.reason?.message || String(p.reason) };
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}