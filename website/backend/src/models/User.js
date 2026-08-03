const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: undefined,
      validate: {
        validator(value) {
          return !value || value.length === 2;
        },
        message: 'Coordinates must be [lng, lat].',
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { _id: false }
);

const aadhaarVerificationSchema = new mongoose.Schema(
  {
    isVerified: {
      type: Boolean,
      default: false,
    },
    maskedLast4: {
      type: String,
      match: /^\d{4}$/,
      default: undefined,
    },
    providerReferenceId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: undefined,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: geoPointSchema,
      default: undefined,
    },
    // Never add or persist a full Aadhaar number. Store only verification metadata.
    aadhaarVerification: {
      type: aadhaarVerificationSchema,
      default: () => ({}),
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    jobsCompletedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    jobsPostedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
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

module.exports = mongoose.model('User', userSchema);
