const { Joi, objectId, pagination } = require('./common');

const listRulesSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    city: Joi.string().trim().max(100),
    area: Joi.string().trim().max(100),
    category: Joi.string().trim().max(60),
    isActive: Joi.boolean(),
    ...pagination,
  }),
  params: Joi.object({}),
});

const ruleBody = Joi.object({
  city: Joi.string().trim().max(100).allow(''),
  area: Joi.string().trim().max(100).allow(''),
  category: Joi.string().trim().max(60).allow(''),
  baseMinimumPrice: Joi.number().min(0).required(),
  hourlyRate: Joi.number().min(0),
  minimumDurationMinutes: Joi.number().min(0),
  isActive: Joi.boolean(),
}).unknown(false);

const createRuleSchema = Joi.object({
  body: ruleBody.required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const updateRuleSchema = Joi.object({
  body: ruleBody.fork(['baseMinimumPrice'], (schema) => schema.optional()).min(1).required(),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const ruleIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = { listRulesSchema, createRuleSchema, updateRuleSchema, ruleIdSchema };
