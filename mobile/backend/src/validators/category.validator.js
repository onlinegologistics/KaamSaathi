const { Joi } = require('./common');

const categoryKey = Joi.string()
  .trim()
  .lowercase()
  .pattern(/^[a-z][a-z0-9-]{1,60}$/);

const color = Joi.string()
  .trim()
  .pattern(/^#[0-9a-fA-F]{6}$/);

const categoryGroups = {
  labor: 'Labor',
  'skilled-workers': 'Skilled Workers',
  professional: 'Professional',
  'home-services': 'Home Services',
};

const categoryGroupKey = Joi.string()
  .trim()
  .lowercase()
  .valid(...Object.keys(categoryGroups));

const categoryBody = Joi.object({
  key: categoryKey.required(),
  name: Joi.string().trim().min(2).max(80).required(),
  groupKey: categoryGroupKey.required(),
  groupName: Joi.string()
    .trim()
    .valid(...Object.values(categoryGroups))
    .optional(),
  icon: Joi.string().trim().min(2).max(80).default('briefcase-outline'),
  color: color.default('#F45B18'),
  kycDocumentLabel: Joi.string().trim().max(120).allow('').default(''),
  sortOrder: Joi.number().integer().min(0).max(10000).default(0),
  isActive: Joi.boolean().default(true),
}).unknown(false);

const listCategoriesSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    includeInactive: Joi.boolean(),
  }),
  params: Joi.object({}),
});

const createCategorySchema = Joi.object({
  body: categoryBody.required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const updateCategorySchema = Joi.object({
  body: categoryBody.fork(['key'], (schema) => schema.optional()).min(1).required(),
  query: Joi.object({}),
  params: Joi.object({
    key: categoryKey.required(),
  }).required(),
});

module.exports = {
  categoryKey,
  categoryGroupKey,
  categoryGroups,
  listCategoriesSchema,
  createCategorySchema,
  updateCategorySchema,
};
