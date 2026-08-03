const { Joi } = require('./common');

const revenueSeriesSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    granularity: Joi.string().valid('daily', 'weekly', 'monthly').default('daily'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
  }),
  params: Joi.object({}),
});

module.exports = { revenueSeriesSchema };
