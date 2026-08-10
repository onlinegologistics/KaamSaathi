const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { categoryGroups } = require('../validators/category.validator');

const normalizeCategoryPayload = (body) => ({
  ...body,
  ...(body.groupKey ? { groupName: categoryGroups[body.groupKey] } : {}),
});

const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ groupKey: 1, sortOrder: 1, name: 1 });
  res.json({ success: true, categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(normalizeCategoryPayload(req.body));
  res.status(201).json({ success: true, category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { $set: normalizeCategoryPayload(req.body) },
    { new: true, runValidators: true }
  );
  if (!category) throw new ApiError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  res.json({ success: true, category });
});

const toggleCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  category.isActive = !category.isActive;
  await category.save();
  res.json({ success: true, category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  res.json({ success: true, message: 'Category deleted' });
});

module.exports = { listCategories, createCategory, updateCategory, toggleCategory, deleteCategory };
