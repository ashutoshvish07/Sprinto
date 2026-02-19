const User = require('../models/User');
const Task = require('../models/Task');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true }).select('-password').sort('name');
  res.json({ success: true, count: users.length, users });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new ApiError('User not found', 404);
  res.json({ success: true, user });
});

// @desc    Update user (admin or self)
// @route   PUT /api/users/:id
// @access  Private
const updateUser = asyncHandler(async (req, res) => {
  const { name, email, color, role } = req.body;

  // Only admin can change roles
  const isSelf = req.user._id.toString() === req.params.id;
  if (!isSelf && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to update this user', 403);
  }

  const updateData = { name, email, color };
  if (req.user.role === 'admin' && role) {
    updateData.role = role;
  }

  // Remove undefined keys
  Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) throw new ApiError('User not found', 404);

  res.json({ success: true, user });
});

// @desc    Delete / deactivate user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError('Cannot delete your own account', 400);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!user) throw new ApiError('User not found', 404);

  res.json({ success: true, message: 'User deactivated' });
});

// @desc    Get user stats
// @route   GET /api/users/:id/stats
// @access  Private
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const [total, done, inProgress, todo] = await Promise.all([
    Task.countDocuments({ assignee: userId }),
    Task.countDocuments({ assignee: userId, status: 'done' }),
    Task.countDocuments({ assignee: userId, status: 'in-progress' }),
    Task.countDocuments({ assignee: userId, status: 'todo' }),
  ]);

  res.json({
    success: true,
    stats: { total, done, inProgress, todo, completionRate: total ? Math.round((done / total) * 100) : 0 },
  });
});

module.exports = { getUsers, getUser, updateUser, deleteUser, getUserStats };
