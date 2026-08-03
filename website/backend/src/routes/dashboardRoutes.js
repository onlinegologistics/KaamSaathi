const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { revenueSeriesSchema } = require('../validators/dashboard.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/stats', dashboardController.getStats);
router.get('/revenue', validate(revenueSeriesSchema), dashboardController.getRevenueSeries);

module.exports = router;
