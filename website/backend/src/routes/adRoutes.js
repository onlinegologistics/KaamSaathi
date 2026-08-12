const express = require('express');
const adController = require('../controllers/adController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { createAdSchema, updateAdSchema, adIdSchema } = require('../validators/ad.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', adController.listAds);
router.post('/', validate(createAdSchema), adController.createAd);
router.put('/:id', validate(updateAdSchema), adController.updateAd);
router.patch('/:id/toggle', validate(adIdSchema), adController.toggleAd);
router.delete('/:id', validate(adIdSchema), adController.deleteAd);

module.exports = router;
