const Job = require('../models/Job');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { phone: regex }];
  }
  if (req.query.isBlocked !== undefined) {
    filter.isBlocked = req.query.isBlocked;
  }
  if (req.query.isVerified !== undefined) {
    filter['aadhaarVerification.isVerified'] = req.query.isVerified;
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data: users, total, page, limit }) });
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

const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ title: regex }, { description: regex }, { category: regex }];
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('postedBy', 'name phone photoUrl'),
    Job.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data: jobs, total, page, limit }) });
});

const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  res.json({ success: true, message: 'Job removed by admin moderation' });
});

const stats = asyncHandler(async (_req, res) => {
  const [totalUsers, totalJobsPosted, totalJobsCompleted] = await Promise.all([
    User.countDocuments(),
    Job.countDocuments(),
    Job.countDocuments({ status: 'completed' }),
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalJobsPosted,
      totalJobsCompleted,
      revenue: 0,
    },
  });
});

module.exports = { listUsers, blockUser, unblockUser, listJobs, deleteJob, stats };
