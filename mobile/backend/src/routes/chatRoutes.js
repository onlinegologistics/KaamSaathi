const express = require('express');
const chatController = require('../controllers/chatController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  listThreadsSchema,
  chatIdSchema,
  listMessagesSchema,
  sendMessageSchema,
} = require('../validators/chat.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate(listThreadsSchema), chatController.listThreads);
router.get('/:id/messages', validate(listMessagesSchema), chatController.getMessages);
router.post('/:id/messages', validate(sendMessageSchema), chatController.sendMessage);
router.post('/:id/read', validate(chatIdSchema), chatController.markThreadRead);

module.exports = router;
