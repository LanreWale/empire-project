// src/config/env.js (or functions/lib/env.js)
const required = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
};

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "production",

  // Payments
  FLW_PUB_KEY: required("FLW_PUBLIC_KEY"),
  FLW_SEC_KEY: required("FLW_SECRET_KEY"),
  FLW_ENC_KEY: required("FLW_ENCRYPTION_KEY"),

  // Telegram
  TG_BOT_TOKEN: required("TELEGRAM_BOT_TOKEN"),
  TG_CHANNEL: required("TELEGRAM_CHANNEL_USERNAME"),

  // Empire flags/policy
  EMPIRE_KILL_SWITCH: String(process.env.EMPIRE_KILL_SWITCH || "false").toLowerCase() === "true",
  EMPIRE_GLOBAL_MIN_USD: Number(process.env.EMPIRE_GLOBAL_MIN_USD || 500),
};
