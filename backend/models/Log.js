const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    target: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      enum: ['task', 'project', 'user', 'system'],
      default: 'task',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Keep only last 500 logs (TTL-like cleanup via index)
logSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);
