const MinimumPriceRule = require('../models/MinimumPriceRule');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const listRules = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.city) filter.city = new RegExp(req.query.city, 'i');
  if (req.query.area) filter.area = new RegExp(req.query.area, 'i');
  if (req.query.category) filter.category = req.query.category;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive;

  const [rules, total] = await Promise.all([
    MinimumPriceRule.find(filter).sort({ city: 1, area: 1, category: 1 }).skip(skip).limit(limit),
    MinimumPriceRule.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data: rules, total, page, limit }) });
});

const createRule = asyncHandler(async (req, res) => {
  const rule = await MinimumPriceRule.create(req.body);
  res.status(201).json({ success: true, rule });
});

const updateRule = asyncHandler(async (req, res) => {
  const rule = await MinimumPriceRule.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!rule) throw new ApiError(404, 'Pricing rule not found', 'PRICING_RULE_NOT_FOUND');
  res.json({ success: true, rule });
});

const toggleRule = asyncHandler(async (req, res) => {
  const rule = await MinimumPriceRule.findById(req.params.id);
  if (!rule) throw new ApiError(404, 'Pricing rule not found', 'PRICING_RULE_NOT_FOUND');
  rule.isActive = !rule.isActive;
  await rule.save();
  res.json({ success: true, rule });
});

const deleteRule = asyncHandler(async (req, res) => {
  const rule = await MinimumPriceRule.findByIdAndDelete(req.params.id);
  if (!rule) throw new ApiError(404, 'Pricing rule not found', 'PRICING_RULE_NOT_FOUND');
  res.json({ success: true, message: 'Pricing rule deleted' });
});

module.exports = { listRules, createRule, updateRule, toggleRule, deleteRule };
