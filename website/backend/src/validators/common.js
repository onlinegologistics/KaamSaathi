const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const location = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  address: Joi.string().trim().min(2).max(300).required(),
});

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

module.exports = { Joi, objectId, location, pagination };
