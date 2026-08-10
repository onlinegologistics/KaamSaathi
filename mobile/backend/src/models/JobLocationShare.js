const mongoose = require('mongoose');

// Last-known location per (job, user) — NOT a movement history. Live location itself is
// pushed over Socket.IO (location:update); this is only so a screen that opens fresh (or
// reconnects) has an initial marker position instead of waiting for the next GPS tick.
const jobLocationShareSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isSharing: {
      type: Boolean,
      default: false,
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    accuracy: Number,
    heading: Number,
    speed: Number,
  },
  { timestamps: true }
);

jobLocationShareSchema.index({ job: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('JobLocationShare', jobLocationShareSchema);
