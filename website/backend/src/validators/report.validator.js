const { Joi, objectId, pagination } = require('./common');

const listReportsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected'),
    targetType: Joi.string().valid('job', 'user'),
    ...pagination,
  }),
  params: Joi.object({}),
});

const reportIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = { listReportsSchema, reportIdSchema };
