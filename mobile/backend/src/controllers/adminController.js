const Job = require('../models/Job');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const hasCategoryDocument = (user, category) =>
  (user.kyc?.categoryDocuments ?? []).some(
    (document) => document.category === category && hasText(document.documentUrl)
  ) ||
  (['delivery', 'driver'].includes(category) && hasText(user.kyc?.drivingLicenseUrl));

const hasRequiredCategoryDocuments = (user) =>
  (user.workerProfile?.preferredWorkCategories ?? []).every((category) => hasCategoryDocument(user, category));

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
  if (req.query.kycStatus) {
    filter['kyc.status'] = req.query.kycStatus;
  }
  if (req.query.walletStatus) {
    filter['wallet.status'] = req.query.walletStatus;
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

const approveKyc = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  if (!hasText(user.kyc?.aadhaarCardUrl) || !hasText(user.kyc?.selfieUrl)) {
    throw new ApiError(422, 'User has not submitted required KYC documents', 'KYC_DOCUMENTS_MISSING');
  }
  if (!hasRequiredCategoryDocuments(user)) {
    throw new ApiError(422, 'User has not submitted required category documents', 'KYC_CATEGORY_DOCUMENTS_MISSING');
  }

  user.kyc.status = 'verified';
  user.kyc.verifiedAt = new Date();
  user.kyc.rejectionReason = '';
  user.aadhaarVerification.isVerified = true;
  await user.save();
  res.json({ success: true, user });
});

const rejectKyc = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  user.kyc.status = 'rejected';
  user.kyc.verifiedAt = undefined;
  user.kyc.rejectionReason = req.body.reason || 'Rejected by admin';
  user.aadhaarVerification.isVerified = false;
  await user.save();
  res.json({ success: true, user });
});

const approveWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  const hasUpi = hasText(user.wallet?.upiId);
  const hasBank =
    hasText(user.wallet?.bankAccountNumber) &&
    hasText(user.wallet?.bankAccountHolderName) &&
    hasText(user.wallet?.ifscCode);
  if (!hasUpi && !hasBank) {
    throw new ApiError(422, 'User has not submitted wallet details', 'WALLET_DETAILS_MISSING');
  }

  user.wallet.status = 'verified';
  user.wallet.verifiedAt = new Date();
  user.wallet.setupCompletedAt = user.wallet.setupCompletedAt || new Date();
  user.wallet.rejectionReason = '';
  await user.save();
  res.json({ success: true, user });
});

const rejectWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  user.wallet.status = 'rejected';
  user.wallet.verifiedAt = undefined;
  user.wallet.rejectionReason = req.body.reason || 'Rejected by admin';
  await user.save();
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

module.exports = {
  listUsers,
  blockUser,
  unblockUser,
  approveKyc,
  rejectKyc,
  approveWallet,
  rejectWallet,
  listJobs,
  deleteJob,
  stats,
};
