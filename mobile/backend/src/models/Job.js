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
      enum: ['applied', 'accepted', 'rejected', 'cancelled'],
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
      type: Number,
      required: true,
      min: 1,
      max: 8,
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
      max: 3,
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
    acceptedApplicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
      index: true,
    },
    workerOtp: {
      code: {
        type: String,
        trim: true,
        minlength: 6,
        maxlength: 6,
        default: undefined,
      },
      verifiedAt: {
        type: Date,
        default: undefined,
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: undefined,
      },
    },
    scheduledFor: {
      type: Date,
      required: true,
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

jobSchema.index({ location: '2dsphere' });
jobSchema.index({ category: 1, status: 1, scheduledFor: 1 });

module.exports = mongoose.model('Job', jobSchema);
