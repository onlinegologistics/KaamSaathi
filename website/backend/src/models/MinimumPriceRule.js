const mongoose = require('mongoose');

// Mirrors mobile-backend/src/models/MinimumPriceRule.js — same collection
// ("minimumpricerules"), kept as a separate copy since mobile-backend and website-backend
// are independent services. Mobile backend reads it (price suggestions); this admin backend
// manages it (create/edit/toggle rules).
const minimumPriceRuleSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      trim: true,
      default: '',
    },
    area: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    baseMinimumPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    hourlyRate: {
      type: Number,
      min: 0,
      default: undefined,
    },
    minimumDurationMinutes: {
      type: Number,
      min: 0,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

minimumPriceRuleSchema.index({ city: 1, area: 1, category: 1 });

module.exports = mongoose.model('MinimumPriceRule', minimumPriceRuleSchema);
