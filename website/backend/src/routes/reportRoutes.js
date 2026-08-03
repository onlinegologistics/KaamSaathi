const express = require('express');
const reportController = require('../controllers/reportController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { listReportsSchema, reportIdSchema } = require('../validators/report.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', validate(listReportsSchema), reportController.listReports);
router.put('/:id/approve', validate(reportIdSchema), reportController.approveReport);
router.put('/:id/reject', validate(reportIdSchema), reportController.rejectReport);

module.exports = router;
