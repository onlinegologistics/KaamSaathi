const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
};

const errorHandler = (error, _req, res, _next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let code = error.code || 'INTERNAL_ERROR';
  let details = error.details;

  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource id';
    code = 'INVALID_ID';
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource';
    code = 'DUPLICATE_RESOURCE';
    details = error.keyValue;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
      ...(env.nodeEnv === 'development' ? { stack: error.stack } : {}),
    },
  });
};

module.exports = { notFound, errorHandler };
