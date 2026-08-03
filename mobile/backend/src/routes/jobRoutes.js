const express = require('express');
const jobController = require('../controllers/jobController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  createJobSchema,
  listJobsSchema,
  jobIdSchema,
  jobChatSchema,
  updateJobSchema,
  applicantActionSchema,
  verifyWorkerOtpSchema,
  rateJobSchema,
} = require('../validators/job.validator');

const router = express.Router();

router.use(requireAuth);

router.route('/')
  .get(validate(listJobsSchema), jobController.listJobs)
  .post(validate(createJobSchema), jobController.createJob);

router.route('/:id')
  .get(validate(jobIdSchema), jobController.getJob)
  .put(validate(updateJobSchema), jobController.updateJob)
  .delete(validate(jobIdSchema), jobController.deleteJob);

router.get('/:id/chat', validate(jobChatSchema), jobController.getJobChat);
router.post('/:id/apply', validate(jobIdSchema), jobController.applyToJob);
router.post('/:id/application/cancel', validate(jobIdSchema), jobController.cancelAcceptedApplication);
router.post('/:id/applicants/:userId/accept', validate(applicantActionSchema), jobController.acceptApplicant);
router.post('/:id/applicants/:userId/reject', validate(applicantActionSchema), jobController.rejectApplicant);
router.post('/:id/worker-otp/verify', validate(verifyWorkerOtpSchema), jobController.verifyWorkerOtp);
router.post('/:id/complete', validate(jobIdSchema), jobController.completeJob);
router.post('/:id/rate', validate(rateJobSchema), jobController.rateJob);

module.exports = router;
