const { Joi, objectId, pagination } = require('./common');

const listUsersSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    search: Joi.string().trim().max(100),
    isBlocked: Joi.boolean(),
    isVerified: Joi.boolean(),
    kycStatus: Joi.string().valid('not_started', 'submitted', 'verified', 'rejected'),
    walletStatus: Joi.string().valid('not_started', 'submitted', 'verified', 'rejected'),
    accountTypeStatus: Joi.string().valid('none', 'pending', 'approved', 'rejected'),
    minRating: Joi.number().min(0).max(5),
    location: Joi.string().trim().max(300),
    ...pagination,
  }),
  params: Joi.object({}),
});

const userIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const userRejectSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().trim().max(300).allow(''),
  }),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = { listUsersSchema, userIdSchema, userRejectSchema };
