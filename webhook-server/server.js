const express = require("express");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK_SECRET = "whsec_abewac7j2bA/6E58DvYgg0BfUuNsov";

console.log("✅ Secret confirmed:", WEBHOOK_SECRET.substring(0, 10) + "...");

// Handle body in multiple ways
app.use("/webhooks/chimoney", (req, res, next) => {
  let data = [];
  req.on("data", chunk => data.push(chunk));
  req.on("end", () => {
    const buffer = Buffer.concat(data);
    
    // Save all representations
    req.rawBytes = buffer;
    req.asString = buffer.toString();
    req.asUtf8 = buffer.toString("utf8");
    
    // Try to parse JSON
    try {
      req.body = JSON.parse(buffer.toString());
    } catch {
      req.body = {};
    }
    
    next();
  });
});

app.post("/webhooks/chimoney", (req, res) => {
  const signature = req.headers["webhook-signature"];
  
  console.log("\n📥 INCOMING REQUEST:");
  console.log("Raw bytes length:", req.rawBytes.length);
  console.log("As string:", req.asString.substring(0, 80) + "...");
  console.log("Hex of first 50 bytes:", req.rawBytes.toString("hex").substring(0, 100));
  
  // Calculate signatures using ALL methods
  const signatures = new Set([
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(req.rawBytes).digest("hex"),
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(req.asString).digest("hex"),
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(req.asUtf8).digest("hex"),
  ]);
  
  console.log("\n🔐 CALCULATED SIGNATURES:");
  Array.from(signatures).forEach((sig, i) => {
    console.log(`  ${i}: ${sig.substring(0, 20)}...`);
  });
  
  console.log("Received:", signature?.substring(0, 20) + "...");
  
  if (signatures.has(signature)) {
    console.log("✅ SIGNATURE ACCEPTED!");
    return res.json({
      success: true,
      message: "Webhook verified",
      event: req.body.type,
      timestamp: new Date().toISOString()
    });
  }
  
  console.log("❌ SIGNATURE REJECTED");
  res.status(401).json({
    error: "Invalid signature",
    debug: {
      receivedLength: req.rawBytes.length,
      receivedHexPreview: req.rawBytes.toString("hex").substring(0, 40),
      calculatedSignatures: Array.from(signatures)
    }
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "chimoney-webhook-compatible",
    secret: "verified",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🔄 CHIMONEY WEBHOOK - COMPATIBLE VERSION");
  console.log("=".repeat(60));
  console.log("📍 Port:", PORT);
  console.log("🔐 Accepts multiple body encodings");
  console.log("📤 POST /webhooks/chimoney");
  console.log("=".repeat(60));
  console.log("⏳ Waiting for requests...\n");
});
