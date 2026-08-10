const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z][a-z0-9-]{1,60}$/,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    groupKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z][a-z0-9-]{1,60}$/,
      index: true,
    },
    groupName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      default: 'briefcase-outline',
    },
    color: {
      type: String,
      required: true,
      trim: true,
      match: /^#[0-9a-fA-F]{6}$/,
      default: '#F45B18',
    },
    kycDocumentLabel: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
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

categorySchema.index({ groupKey: 1, sortOrder: 1, name: 1 });

module.exports = mongoose.model('Category', categorySchema);
