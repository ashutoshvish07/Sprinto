const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Global search across tasks, projects, users
// @route   GET /api/search?q=query
// @access  Private
const globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json({ success: true, results: { tasks: [], projects: [], users: [] } });
  }

  const query = q.trim();
  const regex = { $regex: query, $options: 'i' };

  // Get user's accessible projects first
  let accessibleProjectIds = null;
  if (req.user.role !== 'admin') {
    const userProjects = await Project.find({
      $or: [{ manager: req.user._id }, { members: req.user._id }],
    }).select('_id');
    accessibleProjectIds = userProjects.map((p) => p._id);
  }

  const projectFilter = accessibleProjectIds
    ? { _id: { $in: accessibleProjectIds } }
    : {};

  const taskFilter = accessibleProjectIds
    ? { project: { $in: accessibleProjectIds } }
    : {};

  // Run all searches in parallel
  const [tasks, projects, users] = await Promise.all([
    // Search tasks by title or description
    Task.find({
      ...taskFilter,
      $or: [{ title: regex }, { description: regex }, { tags: regex }],
    })
      .populate('assignee', 'name avatar color')
      .populate('project', 'name color')
      .select('title status priority dueDate project assignee tags')
      .limit(8)
      .lean(),

    // Search projects by name or description
    Project.find({
      ...projectFilter,
      $or: [{ name: regex }, { description: regex }],
    })
      .select('name description color taskCounts')
      .limit(5)
      .lean(),

    // Search users by name or email (admin/manager only)
    req.user.role !== 'user'
      ? User.find({
          $or: [{ name: regex }, { email: regex }],
          isActive: true,
        })
          .select('name email role avatar color')
          .limit(5)
          .lean()
      : Promise.resolve([]),
  ]);

  res.json({
    success: true,
    query,
    results: { tasks, projects, users },
    total: tasks.length + projects.length + users.length,
  });
});

module.exports = { globalSearch };
