const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    ctaLabel: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'Learn More',
    },
    ctaUrl: {
      type: String,
      trim: true,
      default: '',
    },
    // Which side of the marketplace this creative is shown to — 'all' covers everyone
    // including accounts that haven't set an accountType yet.
    targetAccountType: {
      type: String,
      enum: ['worker', 'employer', 'both', 'all'],
      default: 'all',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
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

module.exports = mongoose.model('Ad', adSchema);
