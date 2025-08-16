const { sendEmail } = require("./lib/email");
const T = require("./lib/templates");

// POST body: { to, type, data }
exports.handler = async (event) => {
  if ((event.httpMethod||"") !== "POST") return { statusCode:405, body:JSON.stringify({error:"Use POST"}) };
  let body={}; try { body = JSON.parse(event.body||"{}"); } catch { return { statusCode:400, body:'{"error":"Bad JSON"}' }; }

  const to = body.to || process.env.EMAIL_TO || process.env.SMTP_USER;
  const type = body.type || "payoutInitiated";
  const data = body.data || { amount: 5000, ref: "TEST-REF", name: "Lanre", status:"success" };

  let tpl;
  if (type==="payoutInitiated") tpl = T.payoutInitiated(data);
  else if (type==="payoutResult") tpl = T.payoutResult(data);
  else if (type==="bankVerify") tpl = T.bankVerify({ ...data, ok: !!data.ok });
  else return { statusCode:400, body:JSON.stringify({ error:"Unknown type" }) };

  const messageId = await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
  return { statusCode:200, body: JSON.stringify({ ok:true, messageId, type }) };
};
