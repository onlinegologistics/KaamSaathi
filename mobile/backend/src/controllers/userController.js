const User = require('../models/User');
const Rating = require('../models/Rating');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { toGeoPoint } = require('../utils/location');

const profilePayload = (body) => {
  const payload = { ...body };
  if (body.location) {
    payload.location = toGeoPoint(body.location);
  }
  return payload;
};

const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

const upsertProfile = asyncHandler(async (req, res) => {
  const payload = profilePayload(req.body);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: payload }, { new: true, runValidators: true });
  res.json({ success: true, user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const payload = profilePayload(req.body);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: payload }, { new: true, runValidators: true });
  res.json({ success: true, user });
});

const getUserRating = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name phone ratingAverage ratingCount jobsCompletedCount');
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const latestRatings = await Rating.find({ ratedUser: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('ratedBy', 'name photoUrl');

  res.json({
    success: true,
    rating: {
      average: user.ratingAverage,
      count: user.ratingCount,
      latest: latestRatings,
    },
  });
});

module.exports = { getProfile, upsertProfile, updateProfile, getUserRating };
