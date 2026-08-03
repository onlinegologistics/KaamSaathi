const { Joi } = require('./common');

const upsertSettingSchema = Joi.object({
  body: Joi.object({
    type: Joi.string().valid('content', 'toggle', 'json').required(),
    value: Joi.any().required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({
    key: Joi.string().trim().min(1).max(100).required(),
  }).required(),
});

module.exports = { upsertSettingSchema };
