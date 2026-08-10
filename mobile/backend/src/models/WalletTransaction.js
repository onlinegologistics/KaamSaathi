const mongoose = require('mongoose');

// Mirrors website-backend/src/models/WalletTransaction.js — same collection
// ("wallettransactions"), kept as a separate copy since mobile-backend and
// website-backend are independent services.
const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    source: {
      type: String,
      enum: ['add_money', 'withdrawal'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'rejected'],
      default: 'completed',
      index: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
