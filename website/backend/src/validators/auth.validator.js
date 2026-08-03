const { Joi } = require('./common');

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().min(6).max(200).required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const refreshSchema = Joi.object({
  body: Joi.object({
    refreshToken: Joi.string().trim().required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

module.exports = { loginSchema, refreshSchema };
