const { Joi, location } = require('./common');

const profileBody = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  photoUrl: Joi.string()
    .trim()
    .custom((value, helpers) => {
      const isImageSource =
        value === '' ||
        /^https?:\/\//i.test(value) ||
        /^file:\/\//i.test(value) ||
        /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value);
      if (!isImageSource) return helpers.error('string.uri');
      return value;
    })
    .allow(''),
  email: Joi.string().trim().email().allow(''),
  dateOfBirth: Joi.date().max('now').iso(),
  education: Joi.string().trim().max(150).allow(''),
  currentAddress: Joi.string().trim().max(300).allow(''),
  location,
  aadhaarVerification: Joi.forbidden().messages({
    'any.unknown': 'Aadhaar verification can only be updated by a trusted verification flow.',
  }),
  aadhaarNumber: Joi.forbidden().messages({
    'any.unknown': 'Full Aadhaar number must never be sent or stored.',
  }),
  aadhaar: Joi.forbidden().messages({
    'any.unknown': 'Full Aadhaar number must never be sent or stored.',
  }),
})
  .min(1)
  .unknown(false);

const upsertProfileSchema = Joi.object({
  body: profileBody.required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

module.exports = { upsertProfileSchema };
