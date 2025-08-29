// --- config ---
const MIN_WITHDRAW_USD = Number(process.env.MIN_WITHDRAW_USD || 300); // default $300
const PAYOUT_CURRENCY  = String(process.env.PAYOUT_CURRENCY || 'NGN').toUpperCase();
const FALLBACK_USD_RATE = Number(process.env.FALLBACK_USD_RATE || 1500); // USD->currency

// Paystack secret must already be set:
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET; // required
if (!PAYSTACK_SECRET) {
  console.warn('PAYSTACK_SECRET is missing');
}

// --- tiny helpers ---
const json = (code, data) => new Response(JSON.stringify(data), {
  status: code,
  headers: { 'content-type': 'application/json' }
});

// Get live FX with short TTL; free endpoint, no key required.
// You can swap to your preferred provider later.
async function getUsdRate(to = PAYOUT_CURRENCY) {
  try {
    const url = `https://api.exchangerate.host/latest?base=USD&symbols=${encodeURIComponent(to)}`;
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error(`FX ${r.status}`);
    const data = await r.json();
    const rate = Number(data?.rates?.[to]);
    if (!rate || !isFinite(rate)) throw new Error('Bad rate');
    return rate;
  } catch (err) {
    console.warn('FX fetch failed, using fallback:', err.message);
    return FALLBACK_USD_RATE;
  }
}

// Round to smallest unit Paystack expects (kobo = NGN*100, pesewas, etc.)
function toSmallestUnit(amount) {
  // amount is in major units (e.g., NGN)
  return Math.round(Number(amount) * 100);
}

// --- main handler ---
export default async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok:false, error:'POST only' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { ok:false, error:'Invalid JSON' }); }

  const {
    amountUSD,          // requested amount in USD (number)
    recipientCode,      // Paystack transfer recipient code
    reason,             // memo
    reference           // your unique ref/idempotency key
  } = body;

  // 1) enforce minimum USD
  const usd = Number(amountUSD);
  if (!usd || usd < MIN_WITHDRAW_USD) {
    return json(400, { ok:false, error:`Minimum withdrawal is $${MIN_WITHDRAW_USD}` });
  }

  // 2) get live FX and convert to payout currency
  const rate = await getUsdRate(PAYOUT_CURRENCY);       // e.g., 1550 NGN per 1 USD
  const amountMajor = usd * rate;                        // e.g., 300 * 1550 = 465,000 NGN
  const amountMinor = toSmallestUnit(amountMajor);       // e.g., 46,500,000 kobo

  // 3) build Paystack transfer payload
  const payload = {
    source: 'balance',
    amount: amountMinor,
    currency: PAYOUT_CURRENCY,   // NGN, GHS, etc.
    recipient: recipientCode,    // created via transferrecipient
    reason: reason || 'Empire withdrawal',
    reference: reference || `emp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
  };

  try {
    const r = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    if (!r.ok || data?.status === false) {
      return json(r.status || 500, { ok:false, error:data?.message || 'Paystack error', details:data });
    }

    // Successful initiation (transfer may still be queued/processing)
    return json(200, {
      ok: true,
      message: 'Transfer queued',
      fx: { currency: PAYOUT_CURRENCY, ratePerUSD: rate },
      converted: { usd, amountMajor, amountMinor },
      paystack: data
    });
  } catch (e) {
    return json(500, { ok:false, error: e.message || 'Network error' });
  }
}