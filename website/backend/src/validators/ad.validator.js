const { Joi, objectId } = require('./common');

// Mirrors mobile/backend's profile-photo validator: accept an http(s) URL or a base64
// data URI (the admin panel uploads images as base64, same as mobile does for photos).
const imageSource = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const isImageSource =
      value === '' ||
      /^https?:\/\//i.test(value) ||
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value);
    if (!isImageSource) return helpers.error('string.uri');
    return value;
  })
  .allow('');

const targetAccountType = Joi.string().valid('worker', 'employer', 'both', 'all');

const createAdSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim().min(2).max(120).required(),
    subtitle: Joi.string().trim().max(300).allow(''),
    imageUrl: imageSource,
    ctaLabel: Joi.string().trim().max(40).allow(''),
    ctaUrl: Joi.string().trim().max(500).allow(''),
    targetAccountType: targetAccountType.required(),
    isActive: Joi.boolean(),
    sortOrder: Joi.number().integer(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const updateAdSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim().min(2).max(120),
    subtitle: Joi.string().trim().max(300).allow(''),
    imageUrl: imageSource,
    ctaLabel: Joi.string().trim().max(40).allow(''),
    ctaUrl: Joi.string().trim().max(500).allow(''),
    targetAccountType,
    isActive: Joi.boolean(),
    sortOrder: Joi.number().integer(),
  })
    .min(1)
    .required(),
  query: Joi.object({}),
  params: Joi.object({ id: objectId.required() }).required(),
});

const adIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({ id: objectId.required() }).required(),
});

module.exports = { createAdSchema, updateAdSchema, adIdSchema };
