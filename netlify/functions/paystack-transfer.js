exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Use POST" }) };
  }
  const axios = require("axios");
  const { amount, bank_code, account_number, recipient_name, reason } = JSON.parse(event.body || "{}");

  const min = Number(process.env.MIN_TRANSFER_AMOUNT || 0);
  if (Number(amount) < min) {
    return { statusCode: 400, body: JSON.stringify({ error: `Minimum amount is ${min}` }) };
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing PAYSTACK_SECRET_KEY" }) };
  }
  if (!amount || !bank_code || !account_number) {
    return { statusCode: 400, body: JSON.stringify({ error: "amount, bank_code, account_number are required" }) };
  }

  const headers = { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" };
  const reference = `empire_ps_${Date.now()}`;      // unique reference
  const kobo = Math.round(Number(amount) * 100);    // NGN → kobo

  try {
    // 1) Create (or get) recipient
    const rec = await axios.post(
      "https://api.paystack.co/transferrecipient",
      {
        type: "nuban",
        name: recipient_name || "Empire Recipient",
        account_number,
        bank_code,
        currency: "NGN"
      },
      { headers }
    );
    const recipient_code = rec.data?.data?.recipient_code;
    if (!recipient_code) throw new Error("Failed to create recipient");

    // 2) Initiate transfer
    const tr = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: kobo,
        recipient: recipient_code,
        reason: reason || "Empire payout",
        reference
      },
      { headers }
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true, reference, data: tr.data }) };
  } catch (e) {
    const code = e.response?.status || 500;
    return { statusCode: code, body: JSON.stringify({ error: e.response?.data || e.message, reference }) };
  }
};
