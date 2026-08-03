const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const jobRoutes = require('./jobRoutes');
const chatRoutes = require('./chatRoutes');
const aiChatRoutes = require('./aiChatRoutes');
const adminRoutes = require('./adminRoutes');
const settingRoutes = require('./settingRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/chats', chatRoutes);
router.use('/ai-chat', aiChatRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingRoutes);

module.exports = router;
