exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Use POST" }) };
  }
  const axios = require("axios");
  const { account_number, bank_code } = JSON.parse(event.body || "{}");

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing PAYSTACK_SECRET_KEY" }) };
  }
  if (!account_number || !bank_code) {
    return { statusCode: 400, body: JSON.stringify({ error: "account_number and bank_code are required" }) };
  }

  try {
    const r = await axios.get(
      "https://api.paystack.co/bank/resolve",
      {
        params: { account_number, bank_code },
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      }
    );
    return { statusCode: 200, body: JSON.stringify(r.data) };
  } catch (e) {
    const code = e.response?.status || 500;
    return { statusCode: code, body: JSON.stringify({ error: e.response?.data || e.message }) };
  }
};
