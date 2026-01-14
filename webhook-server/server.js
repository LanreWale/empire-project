const express = require("express");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK_SECRET = "whsec_abewac7j2bA/6E58DvYgg0BfUuNsov";

app.use(express.raw({ type: "*/*" }));

app.post("/webhooks/chimoney", (req, res) => {
  const signature = req.headers["webhook-signature"];
  const rawBody = req.body;
  
  console.log("\n=== SECRET DEBUG ===");
  console.log("Secret being used:", WEBHOOK_SECRET);
  console.log("Secret length:", WEBHOOK_SECRET.length);
  console.log("Secret first 10 chars:", WEBHOOK_SECRET.substring(0, 10));
  
  // Show hash of secret to verify it's correct
  const secretHash = crypto.createHash("sha256").update(WEBHOOK_SECRET).digest("hex");
  console.log("SHA256 of secret:", secretHash);
  
  console.log("\n=== BODY DEBUG ===");
  console.log("Raw body as hex:", rawBody.toString("hex"));
  console.log("Raw body as string:", rawBody.toString());
  console.log("Body length:", rawBody.length);
  
  // Calculate signature
  const expectedSig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  
  console.log("\n=== SIGNATURE DEBUG ===");
  console.log("Received:", signature);
  console.log("Expected:", expectedSig);
  
  if (signature === expectedSig) {
    console.log("✅ MATCH!");
    res.json({ success: true, match: true });
  } else {
    console.log("❌ MISMATCH!");
    res.json({ 
      success: false, 
      debug: true,
      secretFirst10: WEBHOOK_SECRET.substring(0, 10),
      secretHash: secretHash,
      bodyLength: rawBody.length,
      expectedSignature: expectedSig
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    secretHint: "whsec_abewac7j2bA/6E58DvYgg0BfUuNsov".substring(0, 10) + "..."
  });
});

app.listen(PORT, () => console.log(`🔍 DEBUG SERVER on ${PORT}`));
