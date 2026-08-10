const express = require('express');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const validate = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  listAdminUsersSchema,
  adminUserIdSchema,
  adminUserRejectSchema,
  listAdminJobsSchema,
} = require('../validators/admin.validator');
const {
  listCategoriesSchema,
  createCategorySchema,
  updateCategorySchema,
} = require('../validators/category.validator');
const { jobIdSchema } = require('../validators/job.validator');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', validate(listAdminUsersSchema), adminController.listUsers);
router.put('/users/:id/block', validate(adminUserIdSchema), adminController.blockUser);
router.put('/users/:id/unblock', validate(adminUserIdSchema), adminController.unblockUser);
router.put('/users/:id/kyc/approve', validate(adminUserIdSchema), adminController.approveKyc);
router.put('/users/:id/kyc/reject', validate(adminUserRejectSchema), adminController.rejectKyc);
router.put('/users/:id/wallet/approve', validate(adminUserIdSchema), adminController.approveWallet);
router.put('/users/:id/wallet/reject', validate(adminUserRejectSchema), adminController.rejectWallet);

router.get('/categories', validate(listCategoriesSchema), categoryController.listAdminCategories);
router.post('/categories', validate(createCategorySchema), categoryController.createCategory);
router.put('/categories/:key', validate(updateCategorySchema), categoryController.updateCategory);

router.get('/jobs', validate(listAdminJobsSchema), adminController.listJobs);
router.delete('/jobs/:id', validate(jobIdSchema), adminController.deleteJob);

router.get('/stats', adminController.stats);

module.exports = router;
