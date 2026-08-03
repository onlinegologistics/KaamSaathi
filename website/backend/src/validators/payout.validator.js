const { Joi, objectId, pagination } = require('./common');

const listPayoutsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    status: Joi.string().valid('pending', 'paid'),
    ...pagination,
  }),
  params: Joi.object({}),
});

const payoutIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = { listPayoutsSchema, payoutIdSchema };
