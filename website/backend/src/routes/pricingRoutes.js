const express = require('express');
const pricingController = require('../controllers/pricingController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { listRulesSchema, createRuleSchema, updateRuleSchema, ruleIdSchema } = require('../validators/pricing.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', validate(listRulesSchema), pricingController.listRules);
router.post('/', validate(createRuleSchema), pricingController.createRule);
router.put('/:id', validate(updateRuleSchema), pricingController.updateRule);
router.patch('/:id/toggle', validate(ruleIdSchema), pricingController.toggleRule);
router.delete('/:id', validate(ruleIdSchema), pricingController.deleteRule);

module.exports = router;
