const express = require('express');
const categoryController = require('../controllers/categoryController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { createCategorySchema, updateCategorySchema, categoryIdSchema } = require('../validators/category.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', categoryController.listCategories);
router.post('/', validate(createCategorySchema), categoryController.createCategory);
router.put('/:id', validate(updateCategorySchema), categoryController.updateCategory);
router.patch('/:id/toggle', validate(categoryIdSchema), categoryController.toggleCategory);
router.delete('/:id', validate(categoryIdSchema), categoryController.deleteCategory);

module.exports = router;
