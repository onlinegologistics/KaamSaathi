const Ad = require('../models/Ad');
const asyncHandler = require('../utils/asyncHandler');

// Public, unauthenticated (matches the categories endpoint) — the app already knows the
// current user's accountType client-side and passes it as a query param.
const listActiveAds = asyncHandler(async (req, res) => {
  const accountType = ['worker', 'employer', 'both'].includes(req.query.accountType)
    ? req.query.accountType
    : undefined;

  const ads = await Ad.find({
    isActive: true,
    $or: [{ targetAccountType: 'all' }, ...(accountType ? [{ targetAccountType: accountType }] : [])],
  }).sort({ sortOrder: 1, createdAt: -1 });

  res.json({ success: true, ads });
});

module.exports = { listActiveAds };
