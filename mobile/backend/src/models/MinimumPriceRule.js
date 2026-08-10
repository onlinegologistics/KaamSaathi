const mongoose = require('mongoose');

// city/area/category are all optional so one collection can represent every fallback tier:
// city+area+category (most specific) -> city+category (area blank) -> category only (city
// blank) -> a single admin-configured global default (everything blank). See
// services/pricingService.js for the lookup order.
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
    // Matches the same category key string used on Job.category (not an ObjectId ref —
    // Job itself stores category as a plain key, so this mirrors that convention).
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
