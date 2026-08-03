const Transaction = require('../models/Transaction');
const env = require('../config/env');

// Creates one Transaction per accepted applicant when a job transitions to 'completed'.
// There is no real payment gateway — this is an internal ledger entry only.
const createTransactionsForCompletedJob = async (job) => {
  const acceptedApplicants = job.applicants.filter((applicant) => applicant.status === 'accepted');
  if (!acceptedApplicants.length) return [];

  const docs = acceptedApplicants.map((applicant) => {
    const amount = job.payAmount;
    const platformCommission = Number((amount * env.platformCommissionRate).toFixed(2));
    return {
      job: job._id,
      payer: job.postedBy,
      payee: applicant.userId,
      amount,
      platformCommission,
      status: 'completed',
      date: new Date(),
    };
  });

  return Transaction.insertMany(docs);
};

module.exports = { createTransactionsForCompletedJob };
