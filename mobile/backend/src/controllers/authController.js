const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const RefreshToken = require('../models/RefreshToken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { hashOtp, hashToken } = require('../utils/crypto');
const { issueTokenPair } = require('../utils/tokens');
const { normalizePhone } = require('../utils/phone');

const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));

const sendOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const { intent = 'login' } = req.body;

  if (intent === 'login') {
    const user = await User.findOne({ phone });
    if (!user || !user.name) {
      throw new ApiError(404, 'No account found. Please register first.', 'USER_NOT_REGISTERED');
    }
  }

  const otp = generateOtp();

  await OtpVerification.deleteMany({ phone, consumedAt: null });
  await OtpVerification.create({
    phone,
    otpHash: hashOtp(phone, otp),
    expiresAt: new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000),
  });

  // TODO: Plug in MSG91/Twilio here to send `otp` to `phone`.
  // When a real SMS provider is enabled, remove `otp` from this API response.
  res.json({
    success: true,
    otp,
    message: 'OTP sent (dev mode)',
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const { otp, intent = 'login' } = req.body;

  const record = await OtpVerification.findOne({ phone, consumedAt: null }).sort({ createdAt: -1 });
  if (!record) {
    throw new ApiError(400, 'Invalid OTP', 'OTP_INVALID');
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, 'Expired OTP', 'OTP_EXPIRED');
  }

  if (record.attempts >= env.otpMaxAttempts) {
    throw new ApiError(429, 'Maximum OTP attempts exceeded', 'OTP_ATTEMPTS_EXCEEDED');
  }

  if (record.otpHash !== hashOtp(phone, otp)) {
    record.attempts += 1;
    await record.save();
    const remainingAttempts = Math.max(env.otpMaxAttempts - record.attempts, 0);
    throw new ApiError(400, 'Invalid OTP', 'OTP_INVALID', { remainingAttempts });
  }

  record.consumedAt = new Date();
  await record.save();

  let user = await User.findOne({ phone });

  if (intent === 'login' && (!user || !user.name)) {
    throw new ApiError(404, 'No account found. Please register first.', 'USER_NOT_REGISTERED');
  }

  if (!user) {
    user = await User.create({ phone, isActive: true });
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'User is blocked', 'USER_BLOCKED');
  }

  const isNewUser = !user.name;

  const tokens = await issueTokenPair(user);
  res.json({
    success: true,
    user,
    isNewUser,
    ...tokens,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;

  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch (_error) {
    throw new ApiError(401, 'Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
  }

  if (payload.type !== 'refresh') {
    throw new ApiError(401, 'Invalid token type', 'REFRESH_TOKEN_INVALID_TYPE');
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({
    user: payload.sub,
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!storedToken) {
    throw new ApiError(401, 'Refresh token has been revoked or expired', 'REFRESH_TOKEN_REVOKED');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.isBlocked) {
    throw new ApiError(401, 'User session is no longer active', 'USER_INACTIVE');
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const tokens = await issueTokenPair(user);
  res.json({ success: true, ...tokens });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
  res.json({ success: true, message: 'Logged out' });
});

module.exports = { sendOtp, verifyOtp, refresh, logout };
