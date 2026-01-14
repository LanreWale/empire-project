const express = require("express");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORRECT SECRET
const WEBHOOK_SECRET = "whsec_abewac7j2bA/6E58DvYgg0BfUuNsov";

// MIDDLEWARE: Capture RAW body BEFORE express.json()
app.use("/webhooks/chimoney", express.raw({ type: "*/*" }));

// Then parse JSON
app.use("/webhooks/chimoney", express.json());

// Verify signature using RAW BODY
function verifySignature(signature, rawBody) {
  if (!rawBody || !signature) return false;
  
  console.log("🔍 Raw body length:", rawBody.length);
  console.log("🔍 First 50 chars:", rawBody.toString().substring(0, 50));
  
  const computed = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)  // Use Buffer directly
    .digest("hex");
  
  console.log("🔐 SIGNATURE CHECK:");
  console.log("Received:", signature?.substring(0, 20) + "...");
  console.log("Expected:", computed.substring(0, 20) + "...");
  console.log("Full Expected:", computed);
  
  return signature === computed;
}

// Webhook endpoint
app.post("/webhooks/chimoney", (req, res) => {
  // Get RAW body from express.raw middleware
  const rawBody = req.body;  // This is Buffer from express.raw
  
  // Parse JSON for event processing
  const parsedBody = JSON.parse(rawBody.toString());
  const signature = req.headers["webhook-signature"];
  
  console.log("\n📥 WEBHOOK RECEIVED:", new Date().toISOString());
  console.log("Event:", parsedBody.type || parsedBody.event || "unknown");
  
  if (!signature) {
    console.error("❌ Missing signature header");
    return res.status(400).json({ error: "Missing webhook-signature header" });
  }
  
  if (!verifySignature(signature, rawBody)) {
    console.error("❌ Signature verification FAILED!");
    return res.status(401).json({ error: "Invalid signature" });
  }
  
  console.log("✅ Signature verification PASSED!");
  
  // Process event
  res.json({
    success: true,
    message: "Webhook processed successfully",
    event: parsedBody.type || parsedBody.event,
    signatureVerified: true,
    timestamp: new Date().toISOString()
  });
});

// Health endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "chimoney-webhook-server",
    timestamp: new Date().toISOString(),
    version: "3.0.0",
    signatureMethod: "RAW_BODY_HMAC_SHA256"
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Chimoney Webhook Server", 
    status: "operational",
    webhook: "POST /webhooks/chimoney"
  });
});

// Start server
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 CHIMONEY WEBHOOK SERVER v3.0.0");
  console.log("=".repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔐 Using express.raw() for signatures`);
  console.log(`📤 Endpoint: POST /webhooks/chimoney`);
  console.log("=".repeat(50));
  console.log("⏳ Waiting for webhooks...\n");
});
