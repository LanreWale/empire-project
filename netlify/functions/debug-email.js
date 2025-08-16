exports.handler = async () => {
  const e = process.env;
  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      env: {
        SMTP_HOST: e.SMTP_HOST || null,
        SMTP_PORT: e.SMTP_PORT || null,
        SMTP_USER: e.SMTP_USER ? "***@"+(e.SMTP_USER.split("@")[1]||"") : null,
        SMTP_FROM: e.SMTP_FROM || e.SMTP_USER || null,
        SMTP_SECURE: e.SMTP_SECURE || null,
        SMTP_PASS: e.SMTP_PASS ? "<hidden>" : null
      }
    })
  };
};
