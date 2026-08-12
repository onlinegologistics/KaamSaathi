const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { user: req.user._id };

  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  res.json({ success: true, unreadCount, ...paginatedResponse({ data, total, page, limit }) });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: true } },
    { new: true }
  );
  if (!notification) {
    throw new ApiError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  }
  res.json({ success: true, notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ success: true });
});

module.exports = { listNotifications, markRead, markAllRead };
