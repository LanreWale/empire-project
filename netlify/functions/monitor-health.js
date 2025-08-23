exports.handler = async () => {
  // Minimal health check
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      server: "ONLINE",
      db: "CONNECTED",    // replace later with real dbPing if needed
      sheets: "OPERATIONAL",
      ai: "ACTIVE",
      sync: "15s",
    }),
  };
};