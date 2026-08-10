const express = require('express');
const userController = require('../controllers/userController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { upsertProfileSchema } = require('../validators/user.validator');
const { walletAmountSchema, listWalletTransactionsSchema } = require('../validators/wallet.validator');
const { Joi, objectId } = require('../validators/common');

const router = express.Router();

const userIdSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object({}),
  params: Joi.object({
    id: objectId.required(),
  }).required(),
});

router.get('/profile', requireAuth, userController.getProfile);
router.post('/profile', requireAuth, validate(upsertProfileSchema), userController.upsertProfile);
router.put('/profile', requireAuth, validate(upsertProfileSchema), userController.updateProfile);
router.get('/:id/rating', requireAuth, validate(userIdSchema), userController.getUserRating);

router.get('/wallet/transactions', requireAuth, validate(listWalletTransactionsSchema), userController.listWalletTransactions);
router.post('/wallet/add-money', requireAuth, validate(walletAmountSchema), userController.addMoney);
router.post('/wallet/withdraw', requireAuth, validate(walletAmountSchema), userController.requestWithdrawal);

module.exports = router;
