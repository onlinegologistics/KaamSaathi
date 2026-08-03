const express = require('express');
const userController = require('../controllers/userController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { listUsersSchema, userIdSchema } = require('../validators/user.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', validate(listUsersSchema), userController.listUsers);
router.get('/:id', validate(userIdSchema), userController.getUserDetail);
router.put('/:id/block', validate(userIdSchema), userController.blockUser);
router.put('/:id/unblock', validate(userIdSchema), userController.unblockUser);
router.put('/:id/verify', validate(userIdSchema), userController.verifyUser);

module.exports = router;
