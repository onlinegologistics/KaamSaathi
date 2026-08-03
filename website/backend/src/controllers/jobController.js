const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { toGeoPoint } = require('../utils/location');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { createTransactionsForCompletedJob } = require('../utils/transactions');

const populateJob = (query) =>
  query.populate('postedBy', 'name phone photoUrl ratingAverage ratingCount aadhaarVerification').populate('applicants.userId', 'name phone photoUrl ratingAverage');

const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ title: regex }, { description: regex }, { category: regex }];
  }

  const [jobs, total] = await Promise.all([
    populateJob(Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Job.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data: jobs, total, page, limit }) });
});

const getJob = asyncHandler(async (req, res) => {
  const job = await populateJob(Job.findById(req.params.id));
  if (!job) throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  res.json({ success: true, job });
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');

  const wasCompleted = job.status === 'completed';
  const payload = { ...req.body };
  if (req.body.location) payload.location = toGeoPoint(req.body.location);

  Object.assign(job, payload);
  await job.save();

  if (!wasCompleted && job.status === 'completed') {
    await createTransactionsForCompletedJob(job);
  }

  const populated = await populateJob(Job.findById(job._id));
  res.json({ success: true, job: populated });
});

const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  await job.deleteOne();
  res.json({ success: true, message: 'Job removed by admin moderation' });
});

module.exports = { listJobs, getJob, updateJob, deleteJob };
