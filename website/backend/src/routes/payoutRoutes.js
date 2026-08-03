const express = require('express');
const payoutController = require('../controllers/payoutController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { listPayoutsSchema, payoutIdSchema } = require('../validators/payout.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', validate(listPayoutsSchema), payoutController.listPayouts);
router.put('/:id/pay', validate(payoutIdSchema), payoutController.markPayoutPaid);

module.exports = router;
