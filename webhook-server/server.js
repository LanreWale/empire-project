const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   SECRETS
================================ */
const CHIMONEY_WEBHOOK_SECRET =
  process.env.CHIMONEY_WEBHOOK_SECRET ||
  "whsec_abewac7j2bA/6E58DvYgg0BfUuNsov";

const RUBIES_WEBHOOK_SECRET =
  process.env.RUBIES_WEBHOOK_SECRET || null;

console.log("✅ Chimoney secret loaded:",
  CHIMONEY_WEBHOOK_SECRET.substring(0, 10) + "..."
);

/* ===============================
   CHIMONEY RAW BODY CAPTURE
   (DO NOT use express.json here)
================================ */
app.use("/webhooks/chimoney", (req, res, next) => {
  let data = [];

  req.on("data", chunk => data.push(chunk));

  req.on("end", () => {
    const buffer = Buffer.concat(data);

    req.rawBytes = buffer;
    req.asString = buffer.toString();
    req.asUtf8 = buffer.toString("utf8");

    try {
      req.body = JSON.parse(buffer.toString());
    } catch {
      req.body = {};
    }

    next();
  });
});

/* ===============================
   CHIMONEY WEBHOOK ENDPOINT
================================ */
app.post("/webhooks/chimoney", (req, res) => {
  const signature = req.headers["webhook-signature"];

  console.log("\n📥 CHIMONEY REQUEST");
  console.log("Raw length:", req.rawBytes.length);
  console.log("Preview:", req.asString.substring(0, 120));

  const signatures = new Set([
    crypto.createHmac("sha256", CHIMONEY_WEBHOOK_SECRET)
      .update(req.rawBytes)
      .digest("hex"),

    crypto.createHmac("sha256", CHIMONEY_WEBHOOK_SECRET)
      .update(req.asString)
      .digest("hex"),

    crypto.createHmac("sha256", CHIMONEY_WEBHOOK_SECRET)
      .update(req.asUtf8)
      .digest("hex"),
  ]);

  console.log("Received sig:", signature?.substring(0, 20));

  if (signature && signatures.has(signature)) {
    console.log("✅ Chimoney signature verified");

    return res.json({
      success: true,
      provider: "chimoney",
      event: req.body?.type || null,
      timestamp: new Date().toISOString()
    });
  }

  console.log("❌ Chimoney signature failed");

  return res.status(401).json({
    error: "Invalid signature"
  });
});

/* ===============================
   RUBIES WEBHOOK ENDPOINT
   (Standard JSON — no raw capture needed)
================================ */
app.use("/webhooks/rubies", express.json({ limit: "1mb" }));

app.post("/webhooks/rubies", (req, res) => {
  console.log("\n💎 RUBIES CALLBACK");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  // Optional signature verification if Rubies provides one
  const rubiesSig = req.headers["x-rubies-signature"];

  if (RUBIES_WEBHOOK_SECRET && rubiesSig) {
    const expected = crypto
      .createHmac("sha256", RUBIES_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (expected !== rubiesSig) {
      console.log("❌ Rubies signature invalid");
      return res.status(401).json({
        error: "Invalid Rubies signature"
      });
    }

    console.log("✅ Rubies signature valid");
  }

  return res.json({
    received: true,
    provider: "rubies",
    timestamp: new Date().toISOString()
  });
});

/* ===============================
   HEALTH CHECK
================================ */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    webhooks: {
      chimoney: true,
      rubies: true
    },
    timestamp: new Date().toISOString()
  });
});

/* ===============================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 WEBHOOK SERVER READY");
  console.log("=".repeat(60));
  console.log("Port:", PORT);
  console.log("POST /webhooks/chimoney");
  console.log("POST /webhooks/rubies");
  console.log("GET  /health");
  console.log("=".repeat(60));
});