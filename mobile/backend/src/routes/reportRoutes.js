const express = require('express');
const reportController = require('../controllers/reportController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { createReportSchema } = require('../validators/report.validator');

const router = express.Router();

router.post('/', requireAuth, validate(createReportSchema), reportController.createReport);

module.exports = router;
