const express = require('express');
const adminController = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  listAdminUsersSchema,
  adminUserIdSchema,
  listAdminJobsSchema,
} = require('../validators/admin.validator');
const { jobIdSchema } = require('../validators/job.validator');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', validate(listAdminUsersSchema), adminController.listUsers);
router.put('/users/:id/block', validate(adminUserIdSchema), adminController.blockUser);
router.put('/users/:id/unblock', validate(adminUserIdSchema), adminController.unblockUser);

router.get('/jobs', validate(listAdminJobsSchema), adminController.listJobs);
router.delete('/jobs/:id', validate(jobIdSchema), adminController.deleteJob);

router.get('/stats', adminController.stats);

module.exports = router;
