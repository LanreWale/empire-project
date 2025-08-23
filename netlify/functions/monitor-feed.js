exports.handler = async () => {
  // Return recent system events (stub until hooked to DB or Sheet)
  const events = [
    { ts: new Date().toISOString(), type: "INFO", message: "System check OK" },
  ];

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(events),
  };
};