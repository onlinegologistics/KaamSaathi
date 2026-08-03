const { Joi, objectId, pagination } = require('./common');

const listUsersSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    search: Joi.string().trim().max(100),
    isBlocked: Joi.boolean(),
    isVerified: Joi.boolean(),
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

module.exports = { listUsersSchema, userIdSchema };
