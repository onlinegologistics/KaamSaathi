const express = require('express');
const settingController = require('../controllers/settingController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { upsertSettingSchema } = require('../validators/setting.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', settingController.getSettings);
router.put('/:key', validate(upsertSettingSchema), settingController.upsertSetting);

module.exports = router;
