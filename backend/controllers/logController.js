const Log = require('../models/Log');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get activity logs
// @route   GET /api/logs
// @access  Private
const getLogs = asyncHandler(async (req, res) => {
  const { project, limit = 50, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (project) {
    query.project = project;
  } else if (req.user.role !== 'admin') {
    // Non-admins see logs from their projects only
    const userProjects = await Project.find({
      $or: [{ manager: req.user._id }, { members: req.user._id }],
    }).select('_id');
    query.project = { $in: userProjects.map((p) => p._id) };
  }

  const [logs, total] = await Promise.all([
    Log.find(query)
      .populate('user', 'name avatar color')
      .populate('project', 'name color')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Log.countDocuments(query),
  ]);

  res.json({
    success: true,
    count: logs.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    logs,
  });
});

module.exports = { getLogs };
