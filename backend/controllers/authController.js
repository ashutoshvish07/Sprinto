const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Log = require('../models/Log');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

// ─── Token Generators ─────────────────────────────────────────────────────────

// Feature 1: Short-lived access token (15 min)
const generateAccessToken = (id) => {
  return jwt.sign({ id, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m',
  });
};

// Feature 1: Long-lived refresh token (7 days)
const generateRefreshToken = (id) => {
  return jwt.sign({ id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

// Send both tokens in response
const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save hashed refresh token to DB
  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await user.save({ validateBeforeSave: false });

  const safeUser = user.toSafeObject ? user.toSafeObject() : user.toObject();

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: safeUser,
  });
};

// ─── Register ─────────────────────────────────────────────────────────────────
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) throw new ApiError('Email already registered', 400);

  const user = await User.create({ name, email, password, role: 'user' });

  // Feature 2: Generate and send verification email
  const rawToken = user.generateEmailVerifyToken();
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${rawToken}`;

  try {
    await sendVerificationEmail(user, verifyUrl);
    console.log(`📧 Verification email sent to ${user.email}`);
  } catch (err) {
    console.error('Verification email failed:', err.message);
    user.emailVerifyToken = undefined;
    user.emailVerifyExpire = undefined;
    await user.save({ validateBeforeSave: false });
  }

  await Log.create({
    user: user._id,
    action: 'Registered account',
    target: user.name,
    targetType: 'user',
  });

  await sendTokenResponse(user, 201, res);
});

// ─── Login ────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) throw new ApiError('Please provide email and password', 400);

  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user) throw new ApiError('Invalid credentials', 401);
  if (!user.isActive) throw new ApiError('Account has been deactivated', 401);

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw new ApiError('Invalid credentials', 401);

  await sendTokenResponse(user, 200, res);
});

// ─── Feature 1: Refresh Access Token ─────────────────────────────────────────
// @route   POST /api/auth/refresh
// @access  Public
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) throw new ApiError('Refresh token required', 400);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError('Invalid or expired refresh token', 401);
  }

  if (decoded.type !== 'refresh') throw new ApiError('Invalid token type', 401);

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    _id: decoded.id,
    refreshToken: hashedToken,
  }).select('+refreshToken');

  if (!user) throw new ApiError('Session not recognized — please log in again', 401);
  if (!user.isActive) throw new ApiError('Account deactivated', 401);

  const newAccessToken = generateAccessToken(user._id);
  res.json({ success: true, accessToken: newAccessToken });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json({ success: true, message: 'Logged out successfully' });
});

// ─── Get Me ───────────────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

// ─── Feature 2: Verify Email ──────────────────────────────────────────────────
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    emailVerifyToken: hashedToken,
    emailVerifyExpire: { $gt: Date.now() },
  }).select('+emailVerifyToken +emailVerifyExpire');

  if (!user) throw new ApiError('Invalid or expired verification link', 400);

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpire = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
});

// ─── Feature 2: Resend Verification Email ────────────────────────────────────
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError('Email is required', 400);

  const user = await User.findOne({ email }).select('+emailVerifyToken +emailVerifyExpire');
  if (!user) throw new ApiError('No account found with that email', 404);
  if (user.isEmailVerified) throw new ApiError('Email is already verified', 400);

  const rawToken = user.generateEmailVerifyToken();
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${rawToken}`;
  await sendVerificationEmail(user, verifyUrl);

  res.json({ success: true, message: 'Verification email resent. Check your inbox.' });
});

// ─── Feature 3: Forgot Password ───────────────────────────────────────────────
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError('Email is required', 400);

  const user = await User.findOne({ email });

  // Same response whether email exists or not (security)
  if (!user) {
    return res.json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    });
  }

  const rawToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

  try {
    await sendPasswordResetEmail(user, resetUrl);
    res.json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError('Email could not be sent. Try again later.', 500);
  }
});

// ─── Feature 3: Reset Password ────────────────────────────────────────────────
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    throw new ApiError('Password must be at least 6 characters', 400);
  }

  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpire');

  if (!user) throw new ApiError('Invalid or expired reset link', 400);

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  user.refreshToken = undefined; // Invalidate all sessions on password reset
  await user.save();

  res.json({ success: true, message: 'Password reset successful. Please log in.' });
});

// ─── Update Password ──────────────────────────────────────────────────────────
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) throw new ApiError('Current password is incorrect', 400);

  user.password = newPassword;
  await user.save();

  await sendTokenResponse(user, 200, res);
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  updatePassword,
};
