const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['applied', 'accepted', 'rejected'],
      default: 'applied',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return value.length === 2;
          },
          message: 'Coordinates must be [lng, lat].',
        },
      },
      address: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300,
      },
    },
    duration: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    payAmount: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    peopleNeeded: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'completed', 'cancelled'],
      default: 'open',
      index: true,
    },
    applicants: {
      type: [applicantSchema],
      default: [],
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    // Mirrors mobile-backend/src/models/Job.js — mobile-backend computes/owns this field;
    // it's declared here too so admin edits (which re-save the whole document) don't drop it.
    endAt: {
      type: Date,
      default: undefined,
    },
    suggestedMinimumPrice: {
      type: Number,
      min: 0,
      default: undefined,
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

jobSchema.index({ location: '2dsphere' });
jobSchema.index({ category: 1, status: 1, scheduledFor: 1 });

module.exports = mongoose.model('Job', jobSchema);
