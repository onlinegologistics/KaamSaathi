const Ad = require('../models/Ad');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listAds = asyncHandler(async (_req, res) => {
  const ads = await Ad.find().sort({ sortOrder: 1, createdAt: -1 });
  res.json({ success: true, ads });
});

const createAd = asyncHandler(async (req, res) => {
  const ad = await Ad.create(req.body);
  res.status(201).json({ success: true, ad });
});

const updateAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!ad) {
    throw new ApiError(404, 'Ad not found', 'AD_NOT_FOUND');
  }
  res.json({ success: true, ad });
});

const toggleAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  if (!ad) {
    throw new ApiError(404, 'Ad not found', 'AD_NOT_FOUND');
  }
  ad.isActive = !ad.isActive;
  await ad.save();
  res.json({ success: true, ad });
});

const deleteAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findByIdAndDelete(req.params.id);
  if (!ad) {
    throw new ApiError(404, 'Ad not found', 'AD_NOT_FOUND');
  }
  res.json({ success: true, message: 'Ad deleted' });
});

module.exports = { listAds, createAd, updateAd, toggleAd, deleteAd };
