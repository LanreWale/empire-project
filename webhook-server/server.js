const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ✅ USE THE CORRECT SECRET FROM YOUR DASHBOARD
const WEBHOOK_SECRET = "whsec_aBevwac7jZmA/0E58OvYggO0IRuMdsov";

// Verify signature
function verifySignature(signature, payload) {
  const computed = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === computed;
}

// Webhook endpoint
app.post('/webhooks/chimoney', (req, res) => {
  const signature = req.headers['x-chimoney-signature'];
  const payload = req.body;
  
  console.log('📥 Event:', payload.event || 'unknown');
  
  // Verify signature
  if (!verifySignature(signature, payload)) {
    console.error('❌ Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process event
  try {
    const event = payload.event;
    const data = payload.data;
    
    // UPDATED: Use Chimoney's actual event names
    switch (event) {
      case 'payout.bank.completed':
      case 'payout.chimoney.completed':
        console.log('✅ Payout completed - Ref:', data?.reference, 'Amount:', data?.amount, data?.currency);
        // TODO: Update your database
        break;
        
      case 'payout.bank.failed':
        console.log('❌ Payout failed - Ref:', data?.reference, 'Reason:', data?.reason);
        // TODO: Notify admin
        break;
        
      case 'user.wallet.funded':
      case 'chimoneypayment.completed':
        console.log('💰 Wallet funded - Amount:', data?.amount, data?.currency, 'User:', data?.userId);
        // TODO: Update user balance
        break;
        
      case 'payout.bank.initiated':
        console.log('🔄 Payout initiated - Ref:', data?.reference);
        // TODO: Mark as processing
        break;
        
      default:
        console.log('⚡ Unhandled event:', event, 'Data:', JSON.stringify(data));
    }
    
    res.status(200).json({ received: true, event: event });
    
  } catch (error) {
    console.error('💥 Error:', error);
    res.status(500).json({ error: 'Processing error' });
  }
});

// Home route
app.get('/', (req, res) => {
  res.send(`
    <h1>Chimoney Webhook Server</h1>
    <p>Webhook endpoint: <code>/webhooks/chimoney</code></p>
    <p>Running on port ${PORT}</p>
    <p>Mode: LIVE (with signature verification)</p>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server started:`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Webhook: http://localhost:${PORT}/webhooks/chimoney`);
  console.log(`   Mode: LIVE with signature verification`);
  console.log(`\n📝 Test with signature:`);
  console.log(`   Run test from Chimoney dashboard`);
});