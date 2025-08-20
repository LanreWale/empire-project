// --- Handler ---------------------------------------------------------------
export async function handler(event) {
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return json(405, { ok: false, error: "Method Not Allowed" });
  }

  const { email, name, phone, approve, status, note } = readInput(event);

  if (!phone) return json(400, { ok: false, error: "Missing phone number for WhatsApp" });

  const isApproved = approve === true || String(status).toLowerCase() === "approved";
  if (!isApproved) return json(400, { ok: false, error: "Set approve:true or status:'approved'" });

  const loginUrl = "https://empireaffiliatemarketinghub.com/login";
  const safeName = name || email || phone;
  const support = "@TheEmpireHq";

  // MAIN message to user (via WhatsApp)
  const body = `Hello ${safeName}, 🎉
Your Empire Affiliate Marketing Hub account has been APPROVED.

Login here: ${loginUrl}

For support, reach us on Telegram: ${support}`;

  const results = {
    whatsapp: await sendWhatsApp({ to: phone, body }).catch((e) => ({ ok: false, error: e.message })),
    telegram: await sendTelegram(`✅ Approved ${safeName} (${phone})`).catch((e) => ({ ok: false, error: e.message })),
    // optional: still send email
    // email: await sendEmail({ to: email, subject: "Welcome", html }).catch((e) => ({ ok: false, error: e.message }))
  };

  const allOk = Object.values(results).every((r) => !r || r.ok || r.skipped);

  return json(allOk ? 200 : 207, {
    ok: allOk,
    phone,
    status: "approved",
    results,
  });
}