exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      time: new Date().toISOString(),
      node: process.version,
      GOOGLE_SHEETS_PUBLIC: process.env.GOOGLE_SHEETS_PUBLIC,
      GOOGLE_SHEETS_WEBAPP_URL: process.env.GOOGLE_SHEETS_WEBAPP_URL || "",
      GS_WEBAPP_KEY_len: (process.env.GS_WEBAPP_KEY || "").length
    })
  };
};
