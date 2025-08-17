const { sendEmail } = require("./lib/email");
const T = require("./lib/templates");
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Use POST' }) };
  }
  const axios = require('axios');
  const { amount, currency, account_bank, account_number, narration } = JSON.parse(event.body || '{}');

  const min = Number(process.env.MIN_TRANSFER_AMOUNT || 0);
  if (Number(amount) < min) {
    return { statusCode: 400, body: JSON.stringify({ error: `Minimum amount is ${min}` }) };
  }
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing FLUTTERWAVE_SECRET_KEY' }) };
  }

  const reference = `empire_${Date.now()}`;
  try {
    const r = await axios.post(
      'https://api.flutterwave.com/v3/transfers',
      {
        account_bank,
        account_number,
        amount: Number(amount),
        currency: currency || 'NGN',
        debit_currency: 'NGN',
        narration: narration || 'Empire payout',
        reference
      },
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true, reference, data: r.data }) };
  } catch (e) {
    const code = e.response?.status || 500;
    const data = e.response?.data || { message: e.message };
    return { statusCode: code, body: JSON.stringify({ error: data, reference }) };
  }
};
/* EMAIL_HOOK_START */
const { sendEmail } = require("./lib/email");
const T = require("./lib/templates");
/* EMAIL_HOOK_END */

// === Empire Email: Payout Initiated ===
try {
  const to = process.env.EMAIL_TO || process.env.SMTP_USER;
  const tpl = T.payoutInitiated({ amount, ref: reference, name: recipientName || "Partner" });
  await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
} catch (e) { /* don’t block transfer on email failure */ }

// === Empire Email: Payout Result ===
try {
  const to = process.env.EMAIL_TO || process.env.SMTP_USER;
  const tpl = T.payoutResult({ amount, ref: reference, status: transferStatus, reason: failureReason });
  await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
} catch (e) { /* ignore email errors */ }
