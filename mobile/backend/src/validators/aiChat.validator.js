const { Joi } = require('./common');

const getMessagesSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
  params: Joi.object({}),
});

const sendMessageSchema = Joi.object({
  body: Joi.object({
    text: Joi.string().trim().min(1).max(2000).required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

module.exports = { getMessagesSchema, sendMessageSchema };
