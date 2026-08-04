const { Joi } = require('./common');

const autocompleteSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    input: Joi.string().trim().min(1).max(200).required(),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    sessionToken: Joi.string().trim().max(200),
  }),
  params: Joi.object({}),
});

const placeDetailsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({
    sessionToken: Joi.string().trim().max(200),
  }),
  params: Joi.object({
    placeId: Joi.string().trim().min(1).max(300).required(),
  }),
});

module.exports = { autocompleteSchema, placeDetailsSchema };
