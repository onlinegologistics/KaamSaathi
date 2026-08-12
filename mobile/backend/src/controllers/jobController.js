const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const Category = require('../models/Category');
const Rating = require('../models/Rating');
const Transaction = require('../models/Transaction');
const Chat = require('../models/Chat');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { toGeoPoint } = require('../utils/location');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const chatService = require('../services/chatService');
const locationService = require('../services/locationService');
const pricingService = require('../services/pricingService');
const notificationService = require('../services/notificationService');

const canManageJob = (user, job) => user.role === 'admin' || job.postedBy.toString() === user._id.toString();

const populateJob = (query) =>
  query
    .populate('postedBy', 'name phone photoUrl ratingAverage ratingCount aadhaarVerification')
    .populate('acceptedApplicant', 'name phone photoUrl ratingAverage ratingCount')
    .populate('applicants.userId', 'name phone photoUrl ratingAverage ratingCount');

const generateWorkerOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// duration is stored in hours; endAt is always derived server-side (never trust a client value —
// the create/update Joi schemas don't even accept an `endAt` field, so req.body can't carry one).
const HOUR_MS = 60 * 60 * 1000;
const computeEndAt = (scheduledFor, durationHours) =>
  new Date(new Date(scheduledFor).getTime() + durationHours * HOUR_MS);

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const requireActiveCategory = async (categoryKey) => {
  const category = await Category.findOne({ key: categoryKey, isActive: true });
  if (!category) {
    throw new ApiError(422, 'Selected category is not active', 'CATEGORY_NOT_ACTIVE');
  }
  return category;
};

const hasCategoryDocument = (user, category) =>
  (user.kyc?.categoryDocuments ?? []).some(
    (document) => document.category === category && hasText(document.documentUrl)
  ) ||
  (['delivery', 'driver'].includes(category) && hasText(user.kyc?.drivingLicenseUrl));

const hasRequiredCategoryDocuments = (user) =>
  (user.workerProfile?.preferredWorkCategories ?? []).every((category) => hasCategoryDocument(user, category));

const hasSubmittedKyc = (user) =>
  !!user &&
  user.kyc?.status === 'verified' &&
  hasText(user.kyc?.aadhaarCardUrl) &&
  hasText(user.kyc?.selfieUrl) &&
  hasRequiredCategoryDocuments(user);

const requireKyc = (user, message) => {
  if (hasSubmittedKyc(user)) return;
  throw new ApiError(403, message, 'KYC_REQUIRED');
};

// accountType gates which side of the marketplace a user can act on — 'worker' never posts,
// 'employer' never applies, 'both' can do either. Mirrors the tab restructuring in the app.
const requireCanPost = (user) => {
  if (user.accountType === 'worker') {
    throw new ApiError(403, 'Switch your account type to employer or both to post a job', 'ACCOUNT_CANNOT_POST');
  }
};

const requireCanApply = (user) => {
  if (user.accountType === 'employer') {
    throw new ApiError(403, 'Switch your account type to worker or both to apply to jobs', 'ACCOUNT_CANNOT_APPLY');
  }
};

const sanitizeJobForUser = (job, userId) => {
  if (!job) return job;
  const json = typeof job.toJSON === 'function' ? job.toJSON() : job;
  const acceptedId =
    typeof json.acceptedApplicant === 'object' ? json.acceptedApplicant?._id : json.acceptedApplicant;
  const isAcceptedApplicant = acceptedId?.toString() === userId.toString();

  if (!isAcceptedApplicant && json.workerOtp?.code) {
    json.workerOtp = { ...json.workerOtp };
    delete json.workerOtp.code;
  }

  return json;
};

const createJob = asyncHandler(async (req, res) => {
  requireCanPost(req.user);
  requireKyc(req.user, 'Please complete KYC before posting a job.');
  const { city, area, ...jobFields } = req.body;
  const category = await requireActiveCategory(jobFields.category);
  const { suggestedMinimum } = await pricingService.getSuggestedMinimumPrice({
    city,
    area,
    category: jobFields.category,
    durationMinutes: jobFields.duration * 60,
  });
  const job = await Job.create({
    ...jobFields,
    categoryGroup: category.groupKey,
    location: toGeoPoint(jobFields.location),
    postedBy: req.user._id,
    endAt: computeEndAt(jobFields.scheduledFor, jobFields.duration),
    suggestedMinimumPrice: suggestedMinimum,
  });

  await User.findByIdAndUpdate(req.user._id, { $inc: { jobsPostedCount: 1 } });
  const populated = await populateJob(Job.findById(job._id));
  res.status(201).json({ success: true, job: sanitizeJobForUser(populated, req.user._id) });
});

const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  const hasGeoFilter = req.query.lat !== undefined && req.query.lng !== undefined;

  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.categoryGroup) filter.categoryGroup = req.query.categoryGroup;
  if (req.query.mine) filter.postedBy = req.user._id;
  if (req.query.applied) filter['applicants.userId'] = req.user._id;
  if (req.query.search) {
    const escaped = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }
  if (req.query.payMin !== undefined || req.query.payMax !== undefined) {
    filter.payAmount = {};
    if (req.query.payMin !== undefined) filter.payAmount.$gte = Number(req.query.payMin);
    if (req.query.payMax !== undefined) filter.payAmount.$lte = Number(req.query.payMax);
  }
  if (req.query.date) {
    const start = new Date(req.query.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.scheduledFor = { $gte: start, $lt: end };
  }
  if (hasGeoFilter) {
    const geoNear = {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [Number(req.query.lng), Number(req.query.lat)],
        },
        distanceField: 'distanceMeters',
        maxDistance: Number(req.query.distanceKm) * 1000,
        spherical: true,
        query: filter,
      },
    };

    const [jobs, totalResult] = await Promise.all([
      Job.aggregate([geoNear, { $skip: skip }, { $limit: limit }]),
      Job.aggregate([geoNear, { $count: 'total' }]),
    ]);

    await Job.populate(jobs, [
      { path: 'postedBy', select: 'name phone photoUrl ratingAverage ratingCount aadhaarVerification' },
      { path: 'applicants.userId', select: 'name phone photoUrl ratingAverage ratingCount' },
    ]);

    const total = totalResult[0]?.total || 0;
    return res.json({
      success: true,
      ...paginatedResponse({ data: jobs.map((job) => sanitizeJobForUser(job, req.user._id)), total, page, limit }),
    });
  }

  const [jobs, total] = await Promise.all([
    populateJob(Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Job.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    ...paginatedResponse({ data: jobs.map((job) => sanitizeJobForUser(job, req.user._id)), total, page, limit }),
  });
});

const getJob = asyncHandler(async (req, res) => {
  const job = await populateJob(Job.findById(req.params.id));
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  res.json({ success: true, job: sanitizeJobForUser(job, req.user._id) });
});

// Authorizes the Call feature server-side (never trust a frontend-only hide/show of the
// button) and hands back only the one phone number the requester is actually allowed to
// see — the broader job/applicant list endpoints already include raw phone numbers for
// other pre-existing reasons, so this is deliberately the one place a phone number is
// released under a real relationship check rather than blanket population.
const getCallInfo = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('postedBy', 'name phone')
    .populate('acceptedApplicant', 'name phone');
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }

  const isPoster = job.postedBy._id.toString() === req.user._id.toString();
  const isAcceptedWorker = job.acceptedApplicant?._id?.toString() === req.user._id.toString();

  if (!job.acceptedApplicant || !(isPoster || isAcceptedWorker)) {
    throw new ApiError(403, 'Calling is only available between the job poster and the accepted worker', 'CALL_NOT_AVAILABLE');
  }

  const otherUser = isPoster ? job.acceptedApplicant : job.postedBy;
  if (!otherUser?.phone) {
    throw new ApiError(422, 'This user has no phone number on file', 'CALL_PHONE_MISSING');
  }

  res.json({ success: true, name: otherUser.name || 'User', phone: otherUser.phone });
});

// Initial marker position for a freshly-opened LiveLocationScreen — the ongoing feed
// comes over Socket.IO (location:update); this just avoids a blank map until the next tick.
const getJobLocations = asyncHandler(async (req, res) => {
  await locationService.assertCanShareLocation(req.params.id, req.user._id);
  const shares = await locationService.getSharesForJob(req.params.id);
  res.json({
    success: true,
    data: shares.map((share) => ({
      userId: share.user.toString(),
      latitude: share.latitude,
      longitude: share.longitude,
      accuracy: share.accuracy,
      heading: share.heading,
      speed: share.speed,
      updatedAt: share.updatedAt,
    })),
  });
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  if (!canManageJob(req.user, job)) {
    throw new ApiError(403, 'You cannot update this job', 'JOB_UPDATE_FORBIDDEN');
  }

  const payload = { ...req.body };
  if (payload.category) {
    const category = await requireActiveCategory(payload.category);
    payload.categoryGroup = category.groupKey;
  }
  if (req.body.location) payload.location = toGeoPoint(req.body.location);

  Object.assign(job, payload);
  if (payload.scheduledFor !== undefined || payload.duration !== undefined) {
    job.endAt = computeEndAt(job.scheduledFor, job.duration);
  }
  await job.save();
  const populated = await populateJob(Job.findById(job._id));
  res.json({ success: true, job: sanitizeJobForUser(populated, req.user._id) });
});

const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  if (!canManageJob(req.user, job)) {
    throw new ApiError(403, 'You cannot delete this job', 'JOB_DELETE_FORBIDDEN');
  }

  await job.deleteOne();
  res.json({ success: true, message: 'Job deleted' });
});

const applyToJob = asyncHandler(async (req, res) => {
  requireCanApply(req.user);
  requireKyc(req.user, 'Please complete KYC before accepting or applying to jobs.');
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  if (job.status !== 'open') {
    throw new ApiError(400, 'Job is not open for applications', 'JOB_NOT_OPEN');
  }
  if (job.postedBy.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot apply to your own job', 'OWN_JOB_APPLICATION');
  }

  const alreadyApplied = job.applicants.some((applicant) => applicant.userId.toString() === req.user._id.toString());
  if (alreadyApplied) {
    throw new ApiError(409, 'You have already applied to this job', 'JOB_ALREADY_APPLIED');
  }

  job.applicants.push({ userId: req.user._id });
  await job.save();

  await notificationService.notifyUser({
    io: req.app.get('io'),
    userId: job.postedBy,
    type: 'new_application',
    title: 'New application received',
    body: `${req.user.name || 'A worker'} applied to "${job.title}".`,
    data: { jobId: job._id.toString() },
  });

  const populated = await populateJob(Job.findById(job._id));
  res.status(201).json({ success: true, job: sanitizeJobForUser(populated, req.user._id) });
});

const cancelAcceptedApplication = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  if (job.status !== 'in-progress' || job.acceptedApplicant?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the accepted worker can cancel this assigned job', 'WORKER_CANCEL_FORBIDDEN');
  }
  if (job.workerOtp?.verifiedAt) {
    throw new ApiError(400, 'This job has already started and cannot be cancelled by the worker', 'WORKER_ALREADY_VERIFIED');
  }

  const applicant = job.applicants.find((item) => item.userId.toString() === req.user._id.toString());
  if (applicant) {
    applicant.status = 'cancelled';
    applicant.updatedAt = new Date();
  }

  job.status = 'open';
  job.acceptedApplicant = undefined;
  job.workerOtp = {
    code: undefined,
    verifiedAt: undefined,
    verifiedBy: undefined,
  };
  await job.save();

  const chat = await Chat.findOne({ job: job._id, poster: job.postedBy, applicant: req.user._id });
  if (chat) {
    const { message } = await chatService.postSystemMessage({
      chatId: chat._id,
      senderId: req.user._id,
      text: `The accepted worker cancelled "${job.title}". The job is open again for new applicants.`,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chat._id}`).emit('message:new', message);
      io.to(`user:${chat.poster}`).emit('thread:updated', { chatId: chat._id.toString() });
      io.to(`user:${chat.applicant}`).emit('thread:updated', { chatId: chat._id.toString() });
    }
  }

  const populated = await populateJob(Job.findById(job._id));
  res.json({ success: true, job: sanitizeJobForUser(populated, req.user._id) });
});

const setApplicantStatus = (status) =>
  asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id);
    if (!job) {
      throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
    }
    if (!canManageJob(req.user, job)) {
      throw new ApiError(403, 'Only the job poster can manage applicants', 'APPLICANT_ACTION_FORBIDDEN');
    }
    if (status === 'accepted') {
      requireKyc(req.user, 'Please complete KYC before accepting a worker.');
    }

    const applicant = job.applicants.find((item) => item.userId.toString() === req.params.userId);
    if (!applicant) {
      throw new ApiError(404, 'Applicant not found', 'APPLICANT_NOT_FOUND');
    }
    if (status === 'accepted') {
      const applicantUser = await User.findById(applicant.userId).select('kyc workerProfile');
      requireKyc(applicantUser, 'The selected worker must complete KYC before being accepted.');
    }
    if (status === 'accepted' && job.acceptedApplicant && job.acceptedApplicant.toString() !== applicant.userId.toString()) {
      throw new ApiError(409, 'A worker has already been accepted for this job', 'JOB_ALREADY_ACCEPTED');
    }
    if (status === 'accepted' && job.status !== 'open' && job.acceptedApplicant?.toString() !== applicant.userId.toString()) {
      throw new ApiError(400, 'Job is not open for acceptance', 'JOB_NOT_OPEN');
    }

    applicant.status = status;
    applicant.updatedAt = new Date();
    // Everyone else still "applied" loses out the moment one worker is accepted — collect
    // who, so they can each get a "not this time" notification below (after save()).
    const autoRejectedApplicantIds = [];
    if (status === 'accepted') {
      job.status = 'in-progress';
      job.acceptedApplicant = applicant.userId;
      job.workerOtp = {
        code: generateWorkerOtp(),
        verifiedAt: undefined,
        verifiedBy: undefined,
      };
      job.applicants.forEach((item) => {
        if (item.userId.toString() !== applicant.userId.toString() && item.status === 'applied') {
          item.status = 'rejected';
          item.updatedAt = new Date();
          autoRejectedApplicantIds.push(item.userId);
        }
      });
    }
    await job.save();

    if (status === 'rejected') {
      await notificationService.notifyUser({
        io: req.app.get('io'),
        userId: applicant.userId,
        type: 'application_rejected',
        title: 'Application not selected',
        body: `You weren't selected for "${job.title}" this time. Better luck next time!`,
        data: { jobId: job._id.toString() },
      });
    }

    if (status === 'accepted') {
      const chat = await chatService.findOrCreateChat({
        jobId: job._id,
        posterId: job.postedBy,
        applicantId: applicant.userId,
      });
      const { message } = await chatService.postSystemMessage({
        chatId: chat._id,
        senderId: job.postedBy,
        text: `Your application for "${job.title}" has been accepted. Please show the OTP in the job details when you reach the work location.`,
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${chat._id}`).emit('message:new', message);
        io.to(`user:${chat.poster}`).emit('thread:updated', { chatId: chat._id.toString() });
        io.to(`user:${chat.applicant}`).emit('thread:updated', { chatId: chat._id.toString() });
      }

      await notificationService.notifyUser({
        io,
        userId: applicant.userId,
        type: 'application_accepted',
        title: 'Application accepted',
        body: `Your application for "${job.title}" has been accepted.`,
        data: { jobId: job._id.toString() },
      });

      await Promise.all(
        autoRejectedApplicantIds.map((rejectedUserId) =>
          notificationService.notifyUser({
            io,
            userId: rejectedUserId,
            type: 'application_rejected',
            title: 'Application not selected',
            body: `Someone else was accepted for "${job.title}". Better luck next time!`,
            data: { jobId: job._id.toString() },
          })
        )
      );
    }

    const populated = await populateJob(Job.findById(job._id));
    res.json({ success: true, job: sanitizeJobForUser(populated, req.user._id) });
  });

const verifyWorkerOtp = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  if (!canManageJob(req.user, job)) {
    throw new ApiError(403, 'Only the job poster can verify this worker', 'WORKER_OTP_FORBIDDEN');
  }
  if (!job.acceptedApplicant || job.status !== 'in-progress') {
    throw new ApiError(400, 'No accepted worker is assigned to this job', 'NO_ACCEPTED_WORKER');
  }
  if (job.workerOtp?.verifiedAt) {
    throw new ApiError(400, 'Worker is already verified', 'WORKER_ALREADY_VERIFIED');
  }
  if (job.workerOtp?.code !== req.body.otp) {
    throw new ApiError(400, 'Invalid worker OTP', 'WORKER_OTP_INVALID');
  }

  job.workerOtp.verifiedAt = new Date();
  job.workerOtp.verifiedBy = req.user._id;
  await job.save();

  const populated = await populateJob(Job.findById(job._id));
  res.json({ success: true, job: sanitizeJobForUser(populated, req.user._id) });
});

const completeJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  if (!canManageJob(req.user, job)) {
    throw new ApiError(403, 'Only the job poster can complete this job', 'JOB_COMPLETE_FORBIDDEN');
  }
  if (job.status === 'completed') {
    throw new ApiError(400, 'Job is already completed', 'JOB_ALREADY_COMPLETED');
  }

  job.status = 'completed';
  await job.save();

  const acceptedApplicants = job.applicants.filter((applicant) => applicant.status === 'accepted');
  const acceptedUserIds = acceptedApplicants.map((applicant) => applicant.userId);

  if (acceptedUserIds.length) {
    await User.updateMany({ _id: { $in: acceptedUserIds } }, { $inc: { jobsCompletedCount: 1 } });

    // Internal ledger only — no real payment gateway. One entry per accepted
    // applicant, mirrored into the same "transactions" collection the admin
    // dashboard (web-backend) reads from.
    await Transaction.insertMany(
      acceptedApplicants.map((applicant) => ({
        job: job._id,
        payer: job.postedBy,
        payee: applicant.userId,
        amount: job.payAmount,
        platformCommission: Number((job.payAmount * env.platformCommissionRate).toFixed(2)),
        status: 'completed',
        date: new Date(),
      }))
    );
  }

  const populated = await populateJob(Job.findById(req.params.id));
  res.json({ success: true, job: sanitizeJobForUser(populated, req.user._id) });
});

const rateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  if (job.status !== 'completed') {
    throw new ApiError(400, 'Only completed jobs can be rated', 'JOB_NOT_COMPLETED');
  }

  const currentUserId = req.user._id.toString();
  const posterId = job.postedBy.toString();
  const acceptedApplicants = job.applicants.filter((applicant) => applicant.status === 'accepted');
  const isAcceptedApplicant = acceptedApplicants.some((applicant) => applicant.userId.toString() === currentUserId);

  let ratedUserId;
  if (currentUserId === posterId) {
    ratedUserId = req.body.ratedUserId || acceptedApplicants[0]?.userId?.toString();
  } else if (isAcceptedApplicant) {
    ratedUserId = posterId;
  }

  if (!ratedUserId) {
    throw new ApiError(403, 'You cannot rate this job', 'RATING_FORBIDDEN');
  }

  const rating = await Rating.findOneAndUpdate(
    { job: job._id, ratedBy: req.user._id },
    {
      $set: {
        ratedUser: ratedUserId,
        score: req.body.score,
        comment: req.body.comment || '',
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  const aggregate = await Rating.aggregate([
    { $match: { ratedUser: new mongoose.Types.ObjectId(ratedUserId) } },
    { $group: { _id: '$ratedUser', average: { $avg: '$score' }, count: { $sum: 1 } } },
  ]);

  const stats = aggregate[0] || { average: 0, count: 0 };
  await User.findByIdAndUpdate(ratedUserId, {
    $set: {
      ratingAverage: Number(stats.average.toFixed(2)),
      ratingCount: stats.count,
    },
  });

  res.status(201).json({ success: true, rating });
});

const getJobChat = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }

  const filter = {
    job: job._id,
    $or: [{ poster: req.user._id }, { applicant: req.user._id }],
  };

  if (req.query.applicantId) {
    if (!canManageJob(req.user, job)) {
      throw new ApiError(403, 'Only the job poster can select applicant chat', 'CHAT_SELECT_FORBIDDEN');
    }
    filter.applicant = req.query.applicantId;
  }

  const chat = await Chat.findOne(filter);

  res.json({ success: true, chat: chat ?? null });
});

module.exports = {
  createJob,
  listJobs,
  getJob,
  getCallInfo,
  getJobLocations,
  getJobChat,
  updateJob,
  deleteJob,
  applyToJob,
  cancelAcceptedApplication,
  acceptApplicant: setApplicantStatus('accepted'),
  rejectApplicant: setApplicantStatus('rejected'),
  verifyWorkerOtp,
  completeJob,
  rateJob,
};
