const { sendEmail } = require("./lib/email");
const T = require("./lib/templates");
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Use POST' }) };
  }
  const axios = require('axios');
  const { account_bank, account_number } = JSON.parse(event.body || '{}');

  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing FLUTTERWAVE_SECRET_KEY' }) };
  }
  if (!account_bank || !account_number) {
    return { statusCode: 400, body: JSON.stringify({ error: 'account_bank and account_number are required' }) };
  }

  try {
    const r = await axios.post(
      'https://api.flutterwave.com/v3/accounts/resolve',
      { account_bank, account_number },
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );
    return { statusCode: 200, body: JSON.stringify(r.data) };
  } catch (e) {
    const code = e.response?.status || 500;
    const data = e.response?.data || { message: e.message };
    return { statusCode: code, body: JSON.stringify({ error: data }) };
  }
};

// === Empire Email: Bank Verification ===
try {
  const to = process.env.EMAIL_TO || process.env.SMTP_USER;
  const tpl = T.bankVerify({ bank: bankCode, account: accountNumber, name: resolvedName, ok: true });
  await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
} catch (e) { /* ignore */ }

// === Empire Email: Bank Verification FAILED ===
try {
  const to = process.env.EMAIL_TO || process.env.SMTP_USER;
  const tpl = T.bankVerify({ bank: bankCode, account: accountNumber, name: "-", ok: false });
  await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
} catch (e) { /* ignore */ }
