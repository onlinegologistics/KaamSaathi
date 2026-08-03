const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kaamsaathi',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  otpExpiresMinutes: toNumber(process.env.OTP_EXPIRES_MINUTES, 5),
  otpMaxAttempts: toNumber(process.env.OTP_MAX_ATTEMPTS, 5),
  otpPepper: process.env.OTP_PEPPER || 'dev-otp-pepper-change-me',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 100),
  otpRateLimitWindowMs: toNumber(process.env.OTP_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  otpRateLimitMax: toNumber(process.env.OTP_RATE_LIMIT_MAX, 5),
  platformCommissionRate: Number(process.env.PLATFORM_COMMISSION_RATE) || 0.1,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
};
