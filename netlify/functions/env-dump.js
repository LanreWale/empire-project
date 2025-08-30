// netlify/functions/env-dump.js
"use strict";

exports.handler = async () => {
  const mask = (v) => (typeof v === "string" ? v.length : 0);

  const pick = (k) => (process.env[k] ?? "");
  const out = {
    time: new Date().toISOString(),
    node: process.version,

    // already present in your current dump
    INVITES_BASE_URL: pick("INVITES_BASE_URL"),
    INVITES_SIGNING_KEY_len: mask(pick("INVITES_SIGNING_KEY")),
    INVITE_TTL_HOURS: pick("INVITE_TTL_HOURS"),
    SHORTENER_PREFIX: pick("SHORTENER_PREFIX"),

    SMTP_HOST: pick("SMTP_HOST"),
    SMTP_PORT: pick("SMTP_PORT"),
    SMTP_SECURE: pick("SMTP_SECURE"),
    SMTP_FROM: pick("SMTP_FROM"),
    SMTP_USER_len: mask(pick("SMTP_USER")),
    SMTP_PASS_len: mask(pick("SMTP_PASS")),

    TELEGRAM_BOT_TOKEN_len: mask(pick("TELEGRAM_BOT_TOKEN")),
    TELEGRAM_CHANNEL_USERNAME: pick("TELEGRAM_CHANNEL_USERNAME"),
    TELEGRAM_CHAT_VALUE: pick("TELEGRAM_CHAT_VALUE"),

    TWILIO_ACCOUNT_SID_len: mask(pick("TWILIO_ACCOUNT_SID")),
    TWILIO_AUTH_TOKEN_len: mask(pick("TWILIO_AUTH_TOKEN")),
    TWILIO_WHATSAPP_FROM: pick("TWILIO_WHATSAPP_FROM"),

    GS_WEBAPP_KEY_len: mask(pick("GS_WEBAPP_KEY")),
    GS_SHEET_ID: pick("GS_SHEET_ID"),

    // 👇 add Flutterwave here
    FLW_SECRET_KEY_len: mask(pick("FLW_SECRET_KEY")),
    FLW_PUBLIC_KEY_len: mask(pick("FLW_PUBLIC_KEY")),
    FLW_ENCRYPTION_KEY_len: mask(pick("FLW_ENCRYPTION_KEY")),
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(out),
  };
};