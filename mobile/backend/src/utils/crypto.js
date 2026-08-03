const crypto = require('crypto');
const env = require('../config/env');

const hashOtp = (phone, otp) =>
  crypto.createHash('sha256').update(`${phone}:${otp}:${env.otpPepper}`).digest('hex');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = { hashOtp, hashToken };
