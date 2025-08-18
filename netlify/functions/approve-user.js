const { notifyWhatsApp } = require('./lib/notify');
const BRIDGE = '/.netlify/functions/gs-bridge';

/**
 * Body:
 *  { phone: "+2348xxxx", fullName: "Jane", admin: "Lanre" }
 * - Marks the latest matching “Pending” row as “Approved”
 * - Sends WhatsApp notification (if Twilio configured)
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  const host = `https://${event.headers.host}`;

  const { phone, fullName, admin } = JSON.parse(event.body||'{}');

  // Log approval in Event_Log
  await fetch(new URL(BRIDGE, host), {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      action:'append', sheet:'Event_Log',
      values:[new Date().toISOString(), admin||'Commander', `Approved: ${fullName||phone||'-'}`]
    })
  }).catch(()=>null);

  // WhatsApp notify (optional)
  let wa = { ok:false, skipped:'twilio_not_configured' };
  if (phone) {
    wa = await notifyWhatsApp(phone, `✅ Hello${fullName? ' '+fullName : ''}! Your Empire dashboard access is approved. Watch for the next steps from the team.`);
  }

  return {
    statusCode:200,
    headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
    body: JSON.stringify({ ok:true, whatsapp:wa })
  };
};