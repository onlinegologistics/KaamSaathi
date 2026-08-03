const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { loginSchema, refreshSchema } = require('../validators/auth.validator');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(refreshSchema), authController.logout);
router.get('/me', requireAdminAuth, authController.me);

module.exports = router;
