const { Joi, pagination } = require('./common');

const listTransactionsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    status: Joi.string().valid('pending', 'completed', 'failed', 'refunded'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    ...pagination,
  }),
  params: Joi.object({}),
});

module.exports = { listTransactionsSchema };
