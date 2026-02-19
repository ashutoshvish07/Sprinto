const Task = require('../models/Task');
const Project = require('../models/Project');
const Log = require('../models/Log');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @desc    Get tasks (with filters)
// @route   GET /api/tasks
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
  const { project, assignee, status, priority, search } = req.query;

  let query = {};

  // Filter by project
  if (project) query.project = project;

  // Non-admins only see tasks in their projects
  if (req.user.role !== 'admin' && !project) {
    const userProjects = await Project.find({
      $or: [{ manager: req.user._id }, { members: req.user._id }],
    }).select('_id');
    query.project = { $in: userProjects.map((p) => p._id) };
  }

  if (assignee) query.assignee = assignee;
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (search) query.title = { $regex: search, $options: 'i' };

  const tasks = await Task.find(query)
    .populate('assignee', 'name avatar color email')
    .populate('createdBy', 'name avatar color')
    .populate('project', 'name color')
    .sort('-createdAt');

  res.json({ success: true, count: tasks.length, tasks });
});

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignee', 'name avatar color email')
    .populate('createdBy', 'name avatar color')
    .populate('project', 'name color members manager');

  if (!task) throw new ApiError('Task not found', 404);

  res.json({ success: true, task });
});

// @desc    Create task
// @route   POST /api/tasks
// @access  Private/Admin/Manager
const createTask = asyncHandler(async (req, res) => {
  const { title, description, project, assignee, priority, dueDate, tags, status } = req.body;

  // Verify project exists and user has access
  const proj = await Project.findById(project);
  if (!proj) throw new ApiError('Project not found', 404);

  if (req.user.role !== 'admin') {
    const isMember = proj.members.some((m) => m.toString() === req.user._id.toString());
    const isManager = proj.manager.toString() === req.user._id.toString();
    if (!isMember && !isManager) {
      throw new ApiError('Not a member of this project', 403);
    }
  }

  const task = await Task.create({
    title,
    description,
    project,
    assignee: assignee || null,
    priority: priority || 'medium',
    dueDate: dueDate || null,
    tags: tags || [],
    status: status || 'todo',
    createdBy: req.user._id,
  });

  await task.populate('assignee', 'name avatar color email');
  await task.populate('createdBy', 'name avatar color');
  await task.populate('project', 'name color');

  // Log
  await Log.create({
    user: req.user._id,
    action: 'Created task',
    target: task.title,
    targetType: 'task',
    project: task.project._id,
  });

  // Broadcast
  req.app.locals.broadcast({
    type: 'task_created',
    payload: { task, user: req.user.name, projectName: proj.name },
  });

  res.status(201).json({ success: true, task });
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = asyncHandler(async (req, res) => {
  let task = await Task.findById(req.params.id).populate('project');
  if (!task) throw new ApiError('Task not found', 404);

  // Users can only update their own assigned tasks (status only)
  if (req.user.role === 'user') {
    if (task.assignee?.toString() !== req.user._id.toString()) {
      throw new ApiError('Not authorized to update this task', 403);
    }
    // Users can only change status
    const { status } = req.body;
    if (!status) throw new ApiError('Users can only update task status', 403);

    const oldStatus = task.status;
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('assignee', 'name avatar color email')
      .populate('createdBy', 'name avatar color')
      .populate('project', 'name color');

    await Log.create({
      user: req.user._id,
      action: `Moved task from ${oldStatus} to ${status}`,
      target: task.title,
      targetType: 'task',
      project: task.project._id,
    });

    req.app.locals.broadcast({
      type: 'task_updated',
      payload: { task, user: req.user.name, change: `status: ${oldStatus} → ${status}` },
    });

    return res.json({ success: true, task });
  }

  // Admin/Manager can update everything
  const { title, description, status, priority, assignee, dueDate, tags } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (assignee !== undefined) updates.assignee = assignee;
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (tags !== undefined) updates.tags = tags;

  const oldStatus = task.status;
  task = await Task.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })
    .populate('assignee', 'name avatar color email')
    .populate('createdBy', 'name avatar color')
    .populate('project', 'name color');

  // Log status change
  if (updates.status && updates.status !== oldStatus) {
    await Log.create({
      user: req.user._id,
      action: `Moved task to ${updates.status}`,
      target: task.title,
      targetType: 'task',
      project: task.project._id,
    });
  } else {
    await Log.create({
      user: req.user._id,
      action: 'Updated task',
      target: task.title,
      targetType: 'task',
      project: task.project._id,
    });
  }

  req.app.locals.broadcast({
    type: 'task_updated',
    payload: { task, user: req.user.name },
  });

  res.json({ success: true, task });
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin/Manager
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project', 'name');
  if (!task) throw new ApiError('Task not found', 404);

  if (req.user.role === 'user') {
    throw new ApiError('Users cannot delete tasks', 403);
  }

  await task.deleteOne();

  await Log.create({
    user: req.user._id,
    action: 'Deleted task',
    target: task.title,
    targetType: 'task',
    project: task.project?._id,
  });

  req.app.locals.broadcast({
    type: 'task_deleted',
    payload: { taskId: req.params.id, taskTitle: task.title, user: req.user.name },
  });

  res.json({ success: true, message: 'Task deleted' });
});

// @desc    Get dashboard stats
// @route   GET /api/tasks/stats
// @access  Private
const getStats = asyncHandler(async (req, res) => {
  let projectFilter = {};

  if (req.user.role !== 'admin') {
    const userProjects = await Project.find({
      $or: [{ manager: req.user._id }, { members: req.user._id }],
    }).select('_id');
    projectFilter = { project: { $in: userProjects.map((p) => p._id) } };
  }

  const [total, done, inProgress, todo, myTasks, overdue] = await Promise.all([
    Task.countDocuments(projectFilter),
    Task.countDocuments({ ...projectFilter, status: 'done' }),
    Task.countDocuments({ ...projectFilter, status: 'in-progress' }),
    Task.countDocuments({ ...projectFilter, status: 'todo' }),
    Task.countDocuments({ ...projectFilter, assignee: req.user._id }),
    Task.countDocuments({
      ...projectFilter,
      status: { $ne: 'done' },
      dueDate: { $lt: new Date() },
    }),
  ]);

  res.json({
    success: true,
    stats: { total, done, inProgress, todo, myTasks, overdue },
  });
});

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, getStats };
