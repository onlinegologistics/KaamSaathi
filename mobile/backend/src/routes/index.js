const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const jobRoutes = require('./jobRoutes');
const chatRoutes = require('./chatRoutes');
const aiChatRoutes = require('./aiChatRoutes');
const adminRoutes = require('./adminRoutes');
const settingRoutes = require('./settingRoutes');
const placesRoutes = require('./placesRoutes');
const categoryRoutes = require('./categoryRoutes');
const reportRoutes = require('./reportRoutes');
const notificationRoutes = require('./notificationRoutes');
const adRoutes = require('./adRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/chats', chatRoutes);
router.use('/ai-chat', aiChatRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingRoutes);
router.use('/places', placesRoutes);
router.use('/categories', categoryRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ads', adRoutes);

module.exports = router;
