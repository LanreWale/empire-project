function brandWrap(title, bodyHtml) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
    <div style="background:#111827;color:#fff;padding:16px 20px">
      <div style="font-weight:700;font-size:18px">Empire Affiliate Marketing Hub</div>
      <div style="font-size:12px;opacity:.8">${title}</div>
    </div>
    <div style="padding:20px;font-size:14px;color:#111">
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
      <div style="font-size:12px;color:#6b7280">
        This email was sent by Empire Hub. Replies go to info@empireaffiliatemarketinghub.com
      </div>
    </div>
  </div>`;
}

function payoutInitiated({ amount, ref, name }) {
  const title = "Payout Initiated";
  const body = `
    <p>Hi ${name||"there"},</p>
    <p>Your payout of <b>₦${Number(amount).toLocaleString("en-NG")}</b> has been initiated.</p>
    <p>Reference: <code>${ref}</code></p>
  `;
  return { subject: "Empire: Payout Initiated", html: brandWrap(title, body), text:
`Payout initiated
Amount: ₦${amount}
Ref: ${ref}`
  };
}

function payoutResult({ amount, ref, status, reason }) {
  const ok = (String(status).toLowerCase()==="success");
  const title = ok ? "Payout Successful" : "Payout Failed";
  const body = `
    <p>Status: <b>${ok?"SUCCESS ✅":"FAILED ❌"}</b></p>
    <p>Amount: <b>₦${Number(amount).toLocaleString("en-NG")}</b></p>
    <p>Reference: <code>${ref}</code></p>
    ${!ok && reason ? `<p>Reason: ${reason}</p>`: "" }
  `;
  return { subject: `Empire: Payout ${ok?"Successful":"Failed"}`, html: brandWrap(title, body), text:
`Payout ${ok?"Successful":"Failed"}
Amount: ₦${amount}
Ref: ${ref}
${reason?`Reason: ${reason}`:""}` };
}

function bankVerify({ bank, account, name, ok }) {
  const title = ok ? "Bank Verification Success" : "Bank Verification Failed";
  const body = `
    <p>Bank: <b>${bank}</b></p>
    <p>Account: <b>${account}</b></p>
    <p>Name: <b>${name || "-"}</b></p>
    <p>Status: <b>${ok?"SUCCESS ✅":"FAILED ❌"}</b></p>
  `;
  return { subject: `Empire: Bank Verification ${ok?"Success":"Failed"}`, html: brandWrap(title, body), text:
`Bank verification ${ok?"success":"failed"}
Bank: ${bank}
Account: ${account}
Name: ${name||"-"}` };
}

module.exports = { payoutInitiated, payoutResult, bankVerify };
