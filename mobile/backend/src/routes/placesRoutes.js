const express = require('express');
const placesController = require('../controllers/placesController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { autocompleteSchema, placeDetailsSchema } = require('../validators/places.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/autocomplete', validate(autocompleteSchema), placesController.autocomplete);
router.get('/:placeId', validate(placeDetailsSchema), placesController.placeDetails);

module.exports = router;
