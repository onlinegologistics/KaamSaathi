const { Joi, phone } = require('./common');

const sendOtpSchema = Joi.object({
  body: Joi.object({
    phone: phone.required(),
    intent: Joi.string().valid('login', 'register').default('login'),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const verifyOtpSchema = Joi.object({
  body: Joi.object({
    phone: phone.required(),
    otp: Joi.string().trim().pattern(/^\d{4}$/).required(),
    intent: Joi.string().valid('login', 'register').default('login'),
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

module.exports = { sendOtpSchema, verifyOtpSchema, refreshSchema };
