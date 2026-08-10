const { Joi, objectId, location, pagination } = require('./common');
const { categoryGroupKey, categoryKey } = require('./category.validator');

const statuses = ['open', 'in-progress', 'completed', 'cancelled'];

const createJobSchema = Joi.object({
  body: Joi.object({
    category: categoryKey.required(),
    title: Joi.string().trim().min(3).max(140).required(),
    description: Joi.string().trim().min(10).max(2000).required(),
    location: location.required(),
    // Only used server-side to compute suggestedMinimumPrice at creation time (same
    // city/area the client already used for the price-suggestion lookup) — not persisted
    // as separate job fields.
    city: Joi.string().trim().max(100).allow(''),
    area: Joi.string().trim().max(100).allow(''),
    duration: Joi.number().min(1).max(8).required(),
    payAmount: Joi.number().min(0).required(),
    peopleNeeded: Joi.number().integer().min(1).max(3).required(),
    scheduledFor: Joi.date().iso().greater('now').required().messages({
      'date.greater': 'Job start time must be in the future.',
    }),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const listJobsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    category: categoryKey,
    categoryGroup: categoryGroupKey,
    status: Joi.string().valid(...statuses),
    mine: Joi.boolean(),
    applied: Joi.boolean(),
    search: Joi.string().trim().max(140),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    distanceKm: Joi.number().min(1).max(100).default(20),
    payMin: Joi.number().min(0),
    payMax: Joi.number().min(0),
    date: Joi.date().iso(),
    ...pagination,
  }).and('lat', 'lng'),
  params: Joi.object({}),
});

const jobIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const jobChatSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    applicantId: objectId,
  }),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const updateJobSchema = Joi.object({
  body: Joi.object({
    category: categoryKey,
    title: Joi.string().trim().min(3).max(140),
    description: Joi.string().trim().min(10).max(2000),
    location,
    duration: Joi.number().min(1).max(8),
    payAmount: Joi.number().min(0),
    peopleNeeded: Joi.number().integer().min(1).max(3),
    status: Joi.string().valid(...statuses),
    scheduledFor: Joi.date().iso().greater('now').messages({
      'date.greater': 'Job start time must be in the future.',
    }),
  }).min(1).required(),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const applicantActionSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
    userId: objectId.required(),
  }).required(),
});

const rateJobSchema = Joi.object({
  body: Joi.object({
    score: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(1000).allow(''),
    ratedUserId: objectId,
  }).required(),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

const verifyWorkerOtpSchema = Joi.object({
  body: Joi.object({
    otp: Joi.string().trim().pattern(/^\d{6}$/).required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = {
  createJobSchema,
  listJobsSchema,
  jobIdSchema,
  jobChatSchema,
  updateJobSchema,
  applicantActionSchema,
  verifyWorkerOtpSchema,
  rateJobSchema,
};
