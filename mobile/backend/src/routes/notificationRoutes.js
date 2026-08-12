const express = require('express');
const notificationController = require('../controllers/notificationController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { listNotificationsSchema, notificationIdSchema } = require('../validators/notification.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate(listNotificationsSchema), notificationController.listNotifications);
router.post('/read-all', notificationController.markAllRead);
router.post('/:id/read', validate(notificationIdSchema), notificationController.markRead);

module.exports = router;
