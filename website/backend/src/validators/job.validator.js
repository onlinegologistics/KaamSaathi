const { Joi, objectId, location, pagination } = require('./common');

const statuses = ['open', 'in-progress', 'completed', 'cancelled'];

const listJobsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    status: Joi.string().valid(...statuses),
    category: Joi.string().trim().max(60),
    search: Joi.string().trim().max(100),
    ...pagination,
  }),
  params: Joi.object({}),
});

const jobIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const updateJobSchema = Joi.object({
  body: Joi.object({
    category: Joi.string().trim().max(60),
    title: Joi.string().trim().min(3).max(140),
    description: Joi.string().trim().min(10).max(2000),
    location,
    duration: Joi.string().trim().min(2).max(80),
    payAmount: Joi.number().min(0),
    peopleNeeded: Joi.number().integer().min(1).max(100),
    status: Joi.string().valid(...statuses),
    scheduledFor: Joi.date().iso(),
  }).min(1).required(),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = { listJobsSchema, jobIdSchema, updateJobSchema };
