const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { listCategories } = require('../services/categoryService');
const { categoryGroups } = require('../validators/category.validator');

const normalizeCategoryPayload = (body) => ({
  ...body,
  ...(body.groupKey ? { groupName: categoryGroups[body.groupKey] } : {}),
});

const listPublicCategories = asyncHandler(async (_req, res) => {
  const categories = await listCategories();
  res.json({ success: true, categories });
});

const listAdminCategories = asyncHandler(async (req, res) => {
  const categories = await listCategories({ includeInactive: !!req.query.includeInactive });
  res.json({ success: true, categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const exists = await Category.findOne({ key: req.body.key });
  if (exists) {
    throw new ApiError(409, 'Category key already exists', 'CATEGORY_EXISTS');
  }
  const category = await Category.create(normalizeCategoryPayload(req.body));
  res.status(201).json({ success: true, category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const payload = normalizeCategoryPayload(req.body);
  delete payload.key;
  const category = await Category.findOneAndUpdate(
    { key: req.params.key },
    { $set: payload },
    { new: true, runValidators: true }
  );
  if (!category) {
    throw new ApiError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  }
  res.json({ success: true, category });
});

module.exports = {
  listPublicCategories,
  listAdminCategories,
  createCategory,
  updateCategory,
};
