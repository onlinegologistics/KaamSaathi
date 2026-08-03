const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { normalizePhone } = require('../utils/phone');

/**
 * IPv6 clients can rotate freely inside their own /64, so a full-address key
 * is trivially defeated. Bucket the prefix instead; IPv4 is used as-is.
 */
const ipKey = (ip) => {
  const value = String(ip || '');
  if (!value.includes(':')) return value;
  return `${value.split(':').slice(0, 4).join(':')}::/64`;
};

const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKey(req.ip),
});

/**
 * Keyed by phone number rather than IP.
 *
 * Indian mobile carriers run large-scale CGNAT, so thousands of unrelated
 * subscribers share one public address — an IP-keyed OTP limit locks out
 * everyone behind a busy tower once a handful of them sign up. The phone
 * number is also the thing actually worth protecting, since it is what
 * receives the SMS and what an attacker would try to flood.
 *
 * `validate` runs before this in the route, so req.body.phone is present and
 * trimmed; the IP fallback only guards against that order being changed.
 */
const otpLimiter = rateLimit({
  windowMs: env.otpRateLimitWindowMs,
  limit: env.otpRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizePhone(req.body?.phone) || ipKey(req.ip),
  message: {
    success: false,
    error: {
      code: 'OTP_RATE_LIMITED',
      message: 'Too many OTP requests. Please try again later.',
    },
  },
});

module.exports = { globalLimiter, otpLimiter };
