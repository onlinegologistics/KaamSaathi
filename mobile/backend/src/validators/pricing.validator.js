const { Joi } = require('./common');
const { categoryKey } = require('./category.validator');

const priceSuggestionSchema = Joi.object({
  body: Joi.object({
    city: Joi.string().trim().max(100).allow(''),
    area: Joi.string().trim().max(100).allow(''),
    category: categoryKey.allow(''),
    durationMinutes: Joi.number().min(30).max(24 * 60).required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

module.exports = { priceSuggestionSchema };
