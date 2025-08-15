const axios = require("axios");

exports.handler = async (event) => {
  try {
    const { account_bank, account_number } = JSON.parse(event.body);

    if (!account_bank || !account_number) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing bank or account number" }) };
    }

    const response = await axios.post(
      "https://api.flutterwave.com/v3/accounts/resolve",
      { account_bank, account_number },
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } }
    );

    return { statusCode: 200, body: JSON.stringify(response.data) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};