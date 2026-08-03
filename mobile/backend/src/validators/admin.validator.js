const { Joi, objectId, pagination } = require('./common');

const listAdminUsersSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    search: Joi.string().trim().max(100),
    isBlocked: Joi.boolean(),
    isVerified: Joi.boolean(),
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

const listAdminJobsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    status: Joi.string().valid('open', 'in-progress', 'completed', 'cancelled'),
    search: Joi.string().trim().max(100),
    ...pagination,
  }),
  params: Joi.object({}),
});

module.exports = { listAdminUsersSchema, adminUserIdSchema, listAdminJobsSchema };
