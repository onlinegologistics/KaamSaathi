const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const listWithdrawals = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { source: 'withdrawal' };
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name phone'),
    WalletTransaction.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data, total, page, limit }) });
});

const approveWithdrawal = asyncHandler(async (req, res) => {
  const transaction = await WalletTransaction.findOneAndUpdate(
    { _id: req.params.id, source: 'withdrawal', status: 'pending' },
    { $set: { status: 'completed' } },
    { new: true }
  ).populate('user', 'name phone');
  if (!transaction) throw new ApiError(404, 'Pending withdrawal not found', 'WITHDRAWAL_NOT_FOUND');
  res.json({ success: true, transaction });
});

const rejectWithdrawal = asyncHandler(async (req, res) => {
  const transaction = await WalletTransaction.findOne({
    _id: req.params.id,
    source: 'withdrawal',
    status: 'pending',
  });
  if (!transaction) throw new ApiError(404, 'Pending withdrawal not found', 'WITHDRAWAL_NOT_FOUND');

  transaction.status = 'rejected';
  transaction.note = req.body.reason || 'Rejected by admin';
  await transaction.save();

  // Withdrawals debit the balance up front, so a rejection refunds the amount back.
  const user = await User.findByIdAndUpdate(
    transaction.user,
    { $inc: { 'wallet.balance': transaction.amount } },
    { new: true }
  );

  res.json({ success: true, transaction, user });
});

module.exports = { listWithdrawals, approveWithdrawal, rejectWithdrawal };
