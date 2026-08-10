const { Joi, objectId, pagination } = require('./common');

const listAdminUsersSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    search: Joi.string().trim().max(100),
    isBlocked: Joi.boolean(),
    isVerified: Joi.boolean(),
    kycStatus: Joi.string().valid('not_started', 'submitted', 'verified', 'rejected'),
    walletStatus: Joi.string().valid('not_started', 'submitted', 'verified', 'rejected'),
    ...pagination,
  }),
  params: Joi.object({}),
});

const adminUserIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const adminUserRejectSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().trim().max(300).allow(''),
  }),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const listAdminJobsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    status: Joi.string().valid('open', 'in-progress', 'completed', 'cancelled'),
    search: Joi.string().trim().max(100),
    ...pagination,
  }),
  params: Joi.object({}),
});

module.exports = { listAdminUsersSchema, adminUserIdSchema, adminUserRejectSchema, listAdminJobsSchema };
