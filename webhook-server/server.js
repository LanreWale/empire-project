const express = require("express");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ USE THE EXACT SECRET FROM YOUR CHIMONEY DASHBOARD
const WEBHOOK_SECRET = "whsec_abewac7j2bA/6E58DvYgg0BfUuNsov";

// Middleware to preserve raw body for signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    // Store raw body for signature verification
    req.rawBody = buf.toString();
  }
}));

// Request logger
app.use((req, res, next) => {
  console.log(`\n[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "chimoney-webhook-server",
    endpoints: {
      health: "GET /health",
      webhookTest: "POST /webhook-test",
      chimoneyWebhook: "POST /webhooks/chimoney"
    },
    timestamp: new Date().toISOString()
  });
});

// Test endpoint (no signature required)
app.post("/webhook-test", (req, res) => {
  console.log("Test webhook body:", req.body);
  res.json({
    success: true,
    message: "Test webhook received successfully",
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// ========== CHIMONEY WEBHOOK ENDPOINT ==========
// ⚠️ IMPORTANT: Must be EXACTLY "/webhooks/chimoney"
app.post("/webhooks/chimoney", (req, res) => {
  console.log("📥 Received webhook at /webhooks/chimoney");
  
  try {
    // 1. Get signature from header
    const signature = req.headers["webhook-signature"];
    
    console.log("Signature header:", signature);
    console.log("Event type:", req.body?.type || "unknown");
    console.log("Raw body length:", req.rawBody?.length || 0);
    
    // 2. Validate signature exists
    if (!signature) {
      console.error("❌ Missing webhook-signature header");
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing webhook-signature header"
      });
    }
    
    // 3. Validate raw body exists
    if (!req.rawBody) {
      console.error("❌ No request body available");
      return res.status(400).json({
        error: "Bad Request",
        message: "No request body provided"
      });
    }
    
    // 4. Compute expected signature
    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest("hex");
    
    console.log("Expected signature:", expectedSignature);
    
    // 5. Compare signatures
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
    
    if (!isValid) {
      console.error("❌ Signature verification failed!");
      console.error("Received:", signature);
      console.error("Expected:", expectedSignature);
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid webhook signature"
      });
    }
    
    console.log("✅ Signature verified successfully!");
    
    // 6. Process the event
    const event = req.body;
    
    switch (event.type) {
      case "payout.bank.completed":
        console.log("💰 Bank payout completed:", event.data);
        // Add your business logic here
        break;
      case "payout.bank.failed":
        console.log("❌ Bank payout failed:", event.data);
        // Add your business logic here
        break;
      case "chimoneypayment.completed":
        console.log("✅ Chimoney payment completed:", event.data);
        // Add your business logic here
        break;
      default:
        console.log("ℹ️ Event type:", event.type);
    }
    
    // 7. Respond successfully
    res.status(200).json({
      success: true,
      message: "Webhook received and verified",
      event: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log("🚀 CHIMONEY WEBHOOK SERVER");
  console.log("=".repeat(60));
  console.log("📍 Health: http://localhost:3000/health");
  console.log("🧪 Test: POST http://localhost:3000/webhook-test");
  console.log("📨 Chimoney: POST http://localhost:3000/webhooks/chimoney");
  console.log("");
  console.log("🔐 Using secret:", WEBHOOK_SECRET);
  console.log("=".repeat(60));
  console.log("\n⏳ Waiting for Chimoney webhooks...\n");
});

// Last updated: 2026-01-14 02:47:19

