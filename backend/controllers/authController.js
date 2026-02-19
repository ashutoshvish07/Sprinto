const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Log = require('../models/Log');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const safeUser = user.toObject ? user.toObject() : user;
  delete safeUser.password;

  res.status(statusCode).json({
    success: true,
    token,
    user: safeUser,
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Only admin can create admin/manager roles
  let assignedRole = 'user';
  if (role && ['admin', 'manager'].includes(role)) {
    // Check if there's an admin token (for seeding purposes only allow via admin)
    assignedRole = 'user'; // Default to user for public registration
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError('Email already registered', 400);
  }

  const user = await User.create({ name, email, password, role: assignedRole });

  // Log registration
  await Log.create({
    user: user._id,
    action: 'Joined the workspace',
    target: user.name,
    targetType: 'user',
  });

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError('Please provide email and password', 400);
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    throw new ApiError('Account has been deactivated', 401);
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new ApiError('Invalid credentials', 401);
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new ApiError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

module.exports = { register, login, getMe, updatePassword };
