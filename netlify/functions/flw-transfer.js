const axios = require("axios");

exports.handler = async (event) => {
  try {
    const { account_bank, account_number, amount, currency, narration } = JSON.parse(event.body);

    if (!account_bank || !account_number || !amount) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
    }

    const minAmount = parseInt(process.env.MIN_TRANSFER_AMOUNT || "500", 10);
    if (amount < minAmount) {
      return { statusCode: 400, body: JSON.stringify({ error: `Minimum transfer is ${minAmount}` }) };
    }

    const response = await axios.post(
      "https://api.flutterwave.com/v3/transfers",
      {
        account_bank,
        account_number,
        amount,
        currency: currency || "NGN",
        narration: narration || "Empire System Transfer",
        reference: `empire_${Date.now()}`
      },
      {
        headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
      }
    );

    await axios.post(`${process.env.URL}/.netlify/functions/_notify`, {
      type: "transfer",
      success: true,
      data: response.data
    });

    return { statusCode: 200, body: JSON.stringify(response.data) };

  } catch (err) {
    await axios.post(`${process.env.URL}/.netlify/functions/_notify`, {
      type: "transfer",
      success: false,
      error: err.message
    });

    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};