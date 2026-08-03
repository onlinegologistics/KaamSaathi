const Payout = require('../models/Payout');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const listPayouts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [payouts, total] = await Promise.all([
    Payout.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('payee', 'name phone'),
    Payout.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data: payouts, total, page, limit }) });
});

const markPayoutPaid = asyncHandler(async (req, res) => {
  const payout = await Payout.findByIdAndUpdate(
    req.params.id,
    { $set: { status: 'paid', paidAt: new Date(), paidBy: req.admin._id } },
    { new: true }
  );
  if (!payout) throw new ApiError(404, 'Payout not found', 'PAYOUT_NOT_FOUND');
  res.json({ success: true, payout });
});

module.exports = { listPayouts, markPayoutPaid };
