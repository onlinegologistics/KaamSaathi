const express = require('express');
const transactionController = require('../controllers/transactionController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { listTransactionsSchema } = require('../validators/transaction.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', validate(listTransactionsSchema), transactionController.listTransactions);
router.get('/export', validate(listTransactionsSchema), transactionController.exportTransactionsCsv);

module.exports = router;
