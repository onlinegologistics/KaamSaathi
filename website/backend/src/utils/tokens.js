const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AdminRefreshToken = require('../models/AdminRefreshToken');
const { hashToken } = require('./crypto');

const parseDurationMs = (value) => {
  const match = String(value).trim().match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * multipliers[unit];
};

const signAccessToken = (admin) =>
  jwt.sign(
    { sub: admin._id.toString(), role: admin.role, type: 'access' },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiresIn }
  );

const signRefreshToken = (admin) =>
  jwt.sign(
    { sub: admin._id.toString(), type: 'refresh' },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn }
  );

const issueTokenPair = async (admin) => {
  const accessToken = signAccessToken(admin);
  const refreshToken = signRefreshToken(admin);
  await AdminRefreshToken.create({
    admin: admin._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + parseDurationMs(env.jwtRefreshExpiresIn)),
  });
  return { accessToken, refreshToken };
};

module.exports = { issueTokenPair, signAccessToken, signRefreshToken, parseDurationMs };
