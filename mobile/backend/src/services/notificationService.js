const Notification = require('../models/Notification');

// Writes the notification and, if a socket server is available, pushes it live to the
// user's personal room (`user:{userId}`, the same room every connected socket auto-joins —
// see socket/index.js) so an already-open app updates instantly without polling.
const notifyUser = async ({ io, userId, type, title, body, data }) => {
  const notification = await Notification.create({ user: userId, type, title, body, data });
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
  return notification;
};

module.exports = { notifyUser };
