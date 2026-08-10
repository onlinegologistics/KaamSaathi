const { Joi, objectId } = require('./common');

const categoryGroups = {
  labor: 'Labor',
  'skilled-workers': 'Skilled Workers',
  professional: 'Professional',
  'home-services': 'Home Services',
};

const groupKey = Joi.string()
  .trim()
  .lowercase()
  .valid(...Object.keys(categoryGroups));

const createCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(60).required(),
    key: Joi.string().trim().lowercase().min(2).max(60).required(),
    groupKey: groupKey.required(),
    icon: Joi.string().trim().max(60).allow(''),
    color: Joi.string().trim().max(30).allow(''),
    kycDocumentLabel: Joi.string().trim().max(120).allow(''),
    sortOrder: Joi.number().integer(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const updateCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(60),
    groupKey,
    icon: Joi.string().trim().max(60).allow(''),
    color: Joi.string().trim().max(30).allow(''),
    kycDocumentLabel: Joi.string().trim().max(120).allow(''),
    sortOrder: Joi.number().integer(),
  }).min(1).required(),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const categoryIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = { categoryGroups, createCategorySchema, updateCategorySchema, categoryIdSchema };
