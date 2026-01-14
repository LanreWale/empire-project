const express = require("express");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORRECT SECRET
const WEBHOOK_SECRET = "whsec_abewac7j2bA/6E58DvYgg0BfUuNsov";

// Store raw body for signature verification
let rawBodyCache = "";
app.use("/webhooks/chimoney", (req, res, next) => {
  rawBodyCache = "";
  req.on("data", (chunk) => {
    rawBodyCache += chunk.toString();
  });
  req.on("end", () => {
    req.rawBody = rawBodyCache;
    next();
  });
});

// Parse JSON with error handling
app.use("/webhooks/chimoney", (req, res, next) => {
  try {
    if (rawBodyCache.trim()) {
      req.body = JSON.parse(rawBodyCache);
    } else {
      req.body = {};
    }
    next();
  } catch (error) {
    console.error("❌ JSON parse error:", error.message);
    req.body = { error: "Invalid JSON" };
    next();
  }
});

// Verify signature using RAW BODY
function verifySignature(signature, rawBody) {
  if (!rawBody || !signature) return false;
  
  const computed = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  
  console.log("🔐 Signature Verification:");
  console.log("  Received:", signature.substring(0, 20) + "...");
  console.log("  Expected:", computed.substring(0, 20) + "...");
  
  return signature === computed;
}

// Webhook endpoint
app.post("/webhooks/chimoney", (req, res) => {
  const signature = req.headers["webhook-signature"];
  
  console.log("\n📥 WEBHOOK RECEIVED:", new Date().toISOString());
  console.log("Event:", req.body?.type || req.body?.event || "unknown");
  
  if (!signature) {
    console.error("❌ Missing signature header");
    return res.status(400).json({ error: "Missing webhook-signature header" });
  }
  
  if (!verifySignature(signature, req.rawBody)) {
    console.error("❌ Signature verification FAILED!");
    return res.status(401).json({ error: "Invalid signature" });
  }
  
  console.log("✅ Signature verification PASSED!");
  
  // Process event
  const eventType = req.body.type || req.body.event || "unknown";
  const eventData = req.body.data || req.body;
  
  if (eventType === "payout.bank.completed") {
    console.log(`💰 BANK PAYOUT: ${eventData.amount} ${eventData.currency}`);
  }
  
  res.json({
    success: true,
    message: "Webhook processed",
    event: eventType,
    signatureVerified: true,
    timestamp: new Date().toISOString()
  });
});

// Health endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "chimoney-webhook-server",
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Chimoney Webhook Server", status: "operational" });
});

// Start server
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 CHIMONEY WEBHOOK SERVER");
  console.log("=".repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔐 Using RAW BODY signature verification`);
  console.log("=".repeat(50));
  console.log("⏳ Waiting for webhooks...\n");
});
