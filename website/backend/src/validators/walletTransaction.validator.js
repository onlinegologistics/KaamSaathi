const { Joi, objectId, pagination } = require('./common');

const listWithdrawalsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    status: Joi.string().valid('completed', 'pending', 'rejected'),
    ...pagination,
  }),
  params: Joi.object({}),
});

const withdrawalIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const rejectWithdrawalSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().trim().max(300).allow(''),
  }),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = { listWithdrawalsSchema, withdrawalIdSchema, rejectWithdrawalSchema };
