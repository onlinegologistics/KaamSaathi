const User = require('../models/User');
const Job = require('../models/Job');
const Transaction = require('../models/Transaction');
const Report = require('../models/Report');
const Payout = require('../models/Payout');
const asyncHandler = require('../utils/asyncHandler');

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = () => {
  const d = startOfToday();
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const getStats = asyncHandler(async (_req, res) => {
  const [
    totalUsers,
    activeJobs,
    completedJobsToday,
    newSignupsThisWeek,
    revenueAgg,
    pendingReports,
    pendingPayouts,
  ] = await Promise.all([
    User.countDocuments(),
    Job.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
    Job.countDocuments({ status: 'completed', updatedAt: { $gte: startOfToday() } }),
    User.countDocuments({ createdAt: { $gte: startOfWeek() } }),
    Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$platformCommission' } } },
    ]),
    Report.countDocuments({ status: 'pending' }),
    Payout.countDocuments({ status: 'pending' }),
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers,
      activeJobs,
      completedJobsToday,
      newSignupsThisWeek,
      totalRevenue: revenueAgg[0]?.total ?? 0,
      pendingReports,
      pendingPayouts,
    },
  });
});

const GRANULARITY_FORMATS = {
  daily: '%Y-%m-%d',
  weekly: '%G-W%V',
  monthly: '%Y-%m',
};

const getRevenueSeries = asyncHandler(async (req, res) => {
  const granularity = ['daily', 'weekly', 'monthly'].includes(req.query.granularity)
    ? req.query.granularity
    : 'daily';
  const format = GRANULARITY_FORMATS[granularity];

  const match = { status: 'completed' };
  if (req.query.dateFrom || req.query.dateTo) {
    match.date = {};
    if (req.query.dateFrom) match.date.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) match.date.$lte = new Date(req.query.dateTo);
  }

  const series = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format, date: '$date' } },
        commission: { $sum: '$platformCommission' },
        volume: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    series: series.map((row) => ({
      period: row._id,
      commission: row.commission,
      volume: row.volume,
      count: row.count,
    })),
  });
});

module.exports = { getStats, getRevenueSeries };
