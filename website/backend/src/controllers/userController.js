const User = require('../models/User');
const Job = require('../models/Job');
const Rating = require('../models/Rating');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { phone: regex }];
  }
  if (req.query.isBlocked !== undefined) filter.isBlocked = req.query.isBlocked;
  if (req.query.isVerified !== undefined) filter['aadhaarVerification.isVerified'] = req.query.isVerified;
  if (req.query.minRating !== undefined) filter.ratingAverage = { $gte: Number(req.query.minRating) };
  if (req.query.location) filter['location.address'] = new RegExp(req.query.location, 'i');

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data: users, total, page, limit }) });
});

const getUserDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  const [jobsPosted, jobsWorked, ratingsReceived] = await Promise.all([
    Job.find({ postedBy: user._id }).sort({ createdAt: -1 }),
    Job.find({ applicants: { $elemMatch: { userId: user._id, status: 'accepted' } } }).sort({ createdAt: -1 }),
    Rating.find({ ratedUser: user._id }).sort({ createdAt: -1 }).populate('ratedBy', 'name photoUrl'),
  ]);

  res.json({ success: true, user, jobsPosted, jobsWorked, ratingsReceived });
});

const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isBlocked: true } }, { new: true });
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isBlocked: false } }, { new: true });
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

const verifyUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { 'aadhaarVerification.isVerified': true } },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user });
});

module.exports = { listUsers, getUserDetail, blockUser, unblockUser, verifyUser };
