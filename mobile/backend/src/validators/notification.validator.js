const { Joi, objectId, pagination } = require('./common');

const listNotificationsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object(pagination),
  params: Joi.object({}),
});

const notificationIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

module.exports = { listNotificationsSchema, notificationIdSchema };
