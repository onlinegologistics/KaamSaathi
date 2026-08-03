const express = require('express');
const aiChatController = require('../controllers/aiChatController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { getMessagesSchema, sendMessageSchema } = require('../validators/aiChat.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate(getMessagesSchema), aiChatController.getMessages);
router.post('/', validate(sendMessageSchema), aiChatController.sendMessage);

module.exports = router;
