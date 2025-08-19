const required = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
};

const bool = (v) => String(v || "false").toLowerCase() === "true";
const num = (v, d) => Number(v ?? d);

module.exports = {
  ENV: {
    NODE_ENV: process.env.NODE_ENV || "production",

    // Telegram
    TELEGRAM_BOT_TOKEN: required("TELEGRAM_BOT_TOKEN"),
    TELEGRAM_CHANNEL_USERNAME: required("TELEGRAM_CHANNEL_USERNAME"),

    // Policy
    EMPIRE_KILL_SWITCH: bool(process.env.EMPIRE_KILL_SWITCH),
    EMPIRE_GLOBAL_MIN_USD: num(process.env.EMPIRE_GLOBAL_MIN_USD, 500),
  },
};
