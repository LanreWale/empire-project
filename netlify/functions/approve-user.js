const { notifyTelegram, notifyWhatsApp } = require('./_notify');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const { name, email, phone, approve } = payload;

    if (!name || !email || !phone || typeof approve !== 'boolean') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error:
            'Required fields: name, email, phone, approve (boolean).',
        }),
      };
    }

    // Compose messages
    const human =
      approve
        ? `🎉 <b>Approved:</b> <i>${name}</i>\n📧 ${email}\n📱 ${phone}`
        : `🚫 <b>Declined:</b> <i>${name}</i>\n📧 ${email}\n📱 ${phone}`;

    const waText =
      approve
        ? `Hello ${name}, your Empire application has been APPROVED. 🎉
We’ll message you with next steps shortly.`
        : `Hello ${name}, thanks for applying to the Empire.
After review, we can’t approve this application right now.`;

    // Send WhatsApp to the user
    const wa = await notifyWhatsApp({
      to: phone,
      body: waText,
    });

    // Announce on Telegram channel (chat ID first, then @username)
    const tg = await notifyTelegram({
      text: human,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        results: {
          whatsapp: wa,
          telegram: tg,
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: String(err) }),
    };
  }
};