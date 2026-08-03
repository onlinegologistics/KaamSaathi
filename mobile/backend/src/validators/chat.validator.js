const { Joi, objectId, pagination } = require('./common');

const listThreadsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({ ...pagination }),
  params: Joi.object({}),
});

const chatIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const listMessagesSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    before: Joi.date().iso(),
    ...pagination,
  }),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const sendMessageSchema = Joi.object({
  body: Joi.object({
    text: Joi.string().trim().min(1).max(2000).required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = { listThreadsSchema, chatIdSchema, listMessagesSchema, sendMessageSchema };
