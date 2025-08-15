const axios = require("axios");

exports.handler = async () => {
  try {
    let url;

    if (process.env.GOOGLE_SHEETS_PUBLIC === "true") {
      url = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&gid=${process.env.GOOGLE_SHEETS_GID}`;
      const response = await axios.get(url);
      return { statusCode: 200, body: JSON.stringify({ csv: response.data }) };
    }

    if (process.env.GOOGLE_SHEETS_WEBAPP_URL) {
      const response = await axios.get(process.env.GOOGLE_SHEETS_WEBAPP_URL);
      return { statusCode: 200, body: JSON.stringify(response.data) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "No Google Sheets configuration set" }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};