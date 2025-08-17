// netlify/functions/test-templates.js
const { renderTemplate } = require("./lib/templates");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { to, type, data } = body;

    if (!to || !type || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Render the email HTML using our template system
    const html = renderTemplate(type, data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        preview: html,
        note: "Template rendered OK (but not sent). Use _notify to send.",
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};