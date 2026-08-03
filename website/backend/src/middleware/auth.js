const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AdminUser = require('../models/AdminUser');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const requireAdminAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Missing bearer token', 'AUTH_TOKEN_MISSING');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch (_error) {
    throw new ApiError(401, 'Invalid or expired access token', 'AUTH_TOKEN_INVALID');
  }

  if (payload.type !== 'access') {
    throw new ApiError(401, 'Invalid token type', 'AUTH_TOKEN_INVALID_TYPE');
  }

  const admin = await AdminUser.findById(payload.sub);
  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'Admin session is no longer active', 'ADMIN_INACTIVE');
  }

  req.admin = admin;
  next();
});

const requireSuperAdmin = (req, _res, next) => {
  if (!req.admin || req.admin.role !== 'super-admin') {
    return next(new ApiError(403, 'Super-admin access required', 'SUPER_ADMIN_REQUIRED'));
  }
  return next();
};

module.exports = { requireAdminAuth, requireSuperAdmin };
