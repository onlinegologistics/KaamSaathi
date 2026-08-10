const express = require('express');
const walletTransactionController = require('../controllers/walletTransactionController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const {
  listWithdrawalsSchema,
  withdrawalIdSchema,
  rejectWithdrawalSchema,
} = require('../validators/walletTransaction.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/withdrawals', validate(listWithdrawalsSchema), walletTransactionController.listWithdrawals);
router.put('/withdrawals/:id/approve', validate(withdrawalIdSchema), walletTransactionController.approveWithdrawal);
router.put('/withdrawals/:id/reject', validate(rejectWithdrawalSchema), walletTransactionController.rejectWithdrawal);

module.exports = router;
