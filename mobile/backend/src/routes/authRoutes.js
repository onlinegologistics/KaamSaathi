const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { otpLimiter } = require('../middleware/rateLimiters');
const { sendOtpSchema, verifyOtpSchema, refreshSchema } = require('../validators/auth.validator');

const router = express.Router();

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(refreshSchema), authController.logout);

module.exports = router;
