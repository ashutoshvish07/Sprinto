const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'user'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: function () {
        return this.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
      },
    },
    color: { type: String, default: '#6366f1' },
    isActive: { type: Boolean, default: true },

    // Feature 1: Refresh Tokens
    refreshToken: { type: String, select: false },

    // Feature 2: Email Verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpire: { type: Date, select: false },

    // Feature 3: Password Reset
    passwordResetToken: { type: String, select: false },
    passwordResetExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.avatar || this.avatar === '') {
    this.avatar = this.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateEmailVerifyToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerifyToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.emailVerifyExpire = Date.now() + 24 * 60 * 60 * 1000;
  return rawToken;
};

userSchema.methods.generatePasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.passwordResetExpire = Date.now() + 60 * 60 * 1000;
  return rawToken;
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.emailVerifyToken;
  delete obj.emailVerifyExpire;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpire;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
