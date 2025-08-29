// netlify/functions/cpa-add.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    // TODO: Replace this with actual save logic (DB, Google Sheet, etc.)
    console.log("Received CPA add payload:", body);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message: "CPA account saved", payload: body })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};