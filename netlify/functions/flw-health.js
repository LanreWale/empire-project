exports.handler = async () => {
  const axios = require('axios');
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing FLUTTERWAVE_SECRET_KEY' }) };
  }
  try {
    const r = await axios.get('https://api.flutterwave.com/v3/banks/NG', {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true, count: r.data?.data?.length || 0 }) };
  } catch (e) {
    const code = e.response?.status || 500;
    return { statusCode: code, body: JSON.stringify({ error: e.response?.data || e.message }) };
  }
};
