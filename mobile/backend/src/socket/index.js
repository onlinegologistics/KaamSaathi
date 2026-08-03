const { verifyAccessToken } = require('../middleware/auth');
const chatService = require('../services/chatService');
const Chat = require('../models/Chat');

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    socket.user = await verifyAccessToken(token);
    next();
  } catch (error) {
    next(new Error(error.code || 'AUTH_TOKEN_INVALID'));
  }
};

const attachSocket = (io) => {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user._id}`);

    socket.on('join_thread', async ({ chatId }, ack) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) throw new Error('CHAT_NOT_FOUND');
        chatService.assertParticipant(chat, socket.user._id);
        socket.join(`chat:${chatId}`);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.code || error.message || 'CHAT_JOIN_FAILED' });
      }
    });

    socket.on('leave_thread', ({ chatId }) => {
      if (chatId) socket.leave(`chat:${chatId}`);
    });

    socket.on('send_message', async ({ chatId, text }, ack) => {
      try {
        const { message, chat } = await chatService.postMessage({
          chatId,
          senderId: socket.user._id,
          text,
        });
        io.to(`chat:${chat._id}`).emit('message:new', message);
        io.to(`user:${chat.poster}`).emit('thread:updated', { chatId: chat._id.toString() });
        io.to(`user:${chat.applicant}`).emit('thread:updated', { chatId: chat._id.toString() });
        ack?.({ ok: true, message });
      } catch (error) {
        ack?.({ ok: false, error: error.code || error.message || 'SEND_MESSAGE_FAILED' });
      }
    });

    socket.on('mark_read', async ({ chatId }, ack) => {
      try {
        const chat = await chatService.markRead({ chatId, userId: socket.user._id });
        io.to(`chat:${chat._id}`).emit('message:read', {
          chatId: chat._id.toString(),
          userId: socket.user._id.toString(),
          readAt: new Date().toISOString(),
        });
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.code || error.message || 'MARK_READ_FAILED' });
      }
    });
  });
};

module.exports = { attachSocket };
