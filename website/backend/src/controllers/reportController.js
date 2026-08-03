const Report = require('../models/Report');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const listReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.targetType) filter.targetType = req.query.targetType;

  const [reports, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reporterId', 'name phone'),
    Report.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data: reports, total, page, limit }) });
});

const setReportStatus = (status) =>
  asyncHandler(async (req, res) => {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { $set: { status, reviewedBy: req.admin._id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!report) throw new ApiError(404, 'Report not found', 'REPORT_NOT_FOUND');
    res.json({ success: true, report });
  });

module.exports = {
  listReports,
  approveReport: setReportStatus('approved'),
  rejectReport: setReportStatus('rejected'),
};
