const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, _res, next) => {
  const payload = {
    body: req.body,
    query: req.query,
    params: req.params,
  };

  const { value, error } = schema.validate(payload, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((detail) => ({
      path: detail.path.join('.'),
      message: detail.message,
    }));
    return next(new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', details));
  }

  req.body = value.body || {};
  req.query = value.query || {};
  req.params = value.params || {};
  return next();
};

module.exports = validate;
