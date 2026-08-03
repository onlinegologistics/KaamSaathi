const mongoose = require('mongoose');

const aiChatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
  },
  { timestamps: true }
);

aiChatMessageSchema.index({ user: 1, createdAt: 1 });

module.exports = mongoose.model('AiChatMessage', aiChatMessageSchema);
