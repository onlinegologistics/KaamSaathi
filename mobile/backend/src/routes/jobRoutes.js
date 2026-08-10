const express = require('express');
const jobController = require('../controllers/jobController');
const pricingController = require('../controllers/pricingController');
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
const { priceSuggestionSchema } = require('../validators/pricing.validator');

const router = express.Router();

router.use(requireAuth);

// Must come before /:id so "price-suggestion" isn't swallowed as a job id.
router.post('/price-suggestion', validate(priceSuggestionSchema), pricingController.getPriceSuggestion);

router.route('/')
  .get(validate(listJobsSchema), jobController.listJobs)
  .post(validate(createJobSchema), jobController.createJob);

router.route('/:id')
  .get(validate(jobIdSchema), jobController.getJob)
  .put(validate(updateJobSchema), jobController.updateJob)
  .delete(validate(jobIdSchema), jobController.deleteJob);

router.get('/:id/call-info', validate(jobIdSchema), jobController.getCallInfo);
router.get('/:id/location', validate(jobIdSchema), jobController.getJobLocations);
router.get('/:id/chat', validate(jobChatSchema), jobController.getJobChat);
router.post('/:id/apply', validate(jobIdSchema), jobController.applyToJob);
router.post('/:id/application/cancel', validate(jobIdSchema), jobController.cancelAcceptedApplication);
router.post('/:id/applicants/:userId/accept', validate(applicantActionSchema), jobController.acceptApplicant);
router.post('/:id/applicants/:userId/reject', validate(applicantActionSchema), jobController.rejectApplicant);
router.post('/:id/worker-otp/verify', validate(verifyWorkerOtpSchema), jobController.verifyWorkerOtp);
router.post('/:id/complete', validate(jobIdSchema), jobController.completeJob);
router.post('/:id/rate', validate(rateJobSchema), jobController.rateJob);

module.exports = router;
