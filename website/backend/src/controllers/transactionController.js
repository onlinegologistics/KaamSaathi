const { Parser } = require('json2csv');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const buildFilter = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.date.$lte = new Date(query.dateTo);
  }
  return filter;
};

const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('payer', 'name phone')
      .populate('payee', 'name phone')
      .populate('job', 'title'),
    Transaction.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data: transactions, total, page, limit }) });
});

const exportTransactionsCsv = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const transactions = await Transaction.find(filter)
    .sort({ date: -1 })
    .populate('payer', 'name phone')
    .populate('payee', 'name phone')
    .populate('job', 'title');

  const rows = transactions.map((t) => ({
    transactionId: t._id.toString(),
    jobId: t.job?._id?.toString() ?? '',
    jobTitle: t.job?.title ?? '',
    payerName: t.payer?.name ?? '',
    payerPhone: t.payer?.phone ?? '',
    payeeName: t.payee?.name ?? '',
    payeePhone: t.payee?.phone ?? '',
    amount: t.amount,
    platformCommission: t.platformCommission,
    status: t.status,
    date: t.date.toISOString(),
  }));

  const parser = new Parser({
    fields: [
      'transactionId', 'jobId', 'jobTitle', 'payerName', 'payerPhone',
      'payeeName', 'payeePhone', 'amount', 'platformCommission', 'status', 'date',
    ],
  });
  const csv = parser.parse(rows);

  res.header('Content-Type', 'text/csv');
  res.attachment(`transactions-${Date.now()}.csv`);
  res.send(csv);
});

module.exports = { listTransactions, exportTransactionsCsv };
