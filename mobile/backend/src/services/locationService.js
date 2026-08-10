const Job = require('../models/Job');
const JobLocationShare = require('../models/JobLocationShare');
const ApiError = require('../utils/ApiError');

const jobParticipantRole = (job, userId) => {
  const id = userId.toString();
  if (job.postedBy.toString() === id) return 'poster';
  if (job.acceptedApplicant?.toString() === id) return 'worker';
  return null;
};

// Location sharing is only ever allowed for the two people actually on an active job —
// never on a job that's merely open/applied-to, and never for anyone else.
const assertCanShareLocation = async (jobId, userId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  const role = jobParticipantRole(job, userId);
  if (!role || !job.acceptedApplicant) {
    throw new ApiError(403, 'You are not part of this job', 'LOCATION_NOT_PARTICIPANT');
  }
  if (job.status !== 'in-progress') {
    throw new ApiError(422, 'Live location is only available while the job is in progress', 'LOCATION_JOB_NOT_ACTIVE');
  }
  return { job, role };
};

const recordLocationUpdate = ({ jobId, userId, latitude, longitude, accuracy, heading, speed }) =>
  JobLocationShare.findOneAndUpdate(
    { job: jobId, user: userId },
    { $set: { isSharing: true, latitude, longitude, accuracy, heading, speed } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

const stopSharing = ({ jobId, userId }) =>
  JobLocationShare.findOneAndUpdate({ job: jobId, user: userId }, { $set: { isSharing: false } });

const getSharesForJob = (jobId) => JobLocationShare.find({ job: jobId, isSharing: true });

module.exports = { assertCanShareLocation, jobParticipantRole, recordLocationUpdate, stopSharing, getSharesForJob };
