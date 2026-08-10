const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { otpLimiter } = require('../middleware/rateLimiters');
const { loginWithPasswordSchema, sendOtpSchema, verifyOtpSchema, refreshSchema } = require('../validators/auth.validator');

const router = express.Router();

// validate runs first so otpLimiter keys off a parsed, trimmed phone number.
router.post('/login', validate(loginWithPasswordSchema), authController.loginWithPassword);
router.post('/send-otp', validate(sendOtpSchema), otpLimiter, authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), otpLimiter, authController.verifyOtp);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(refreshSchema), authController.logout);

module.exports = router;
