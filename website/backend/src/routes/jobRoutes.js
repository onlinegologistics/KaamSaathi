const express = require('express');
const jobController = require('../controllers/jobController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { listJobsSchema, jobIdSchema, updateJobSchema } = require('../validators/job.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', validate(listJobsSchema), jobController.listJobs);
router.get('/:id', validate(jobIdSchema), jobController.getJob);
router.put('/:id', validate(updateJobSchema), jobController.updateJob);
router.delete('/:id', validate(jobIdSchema), jobController.deleteJob);

module.exports = router;
