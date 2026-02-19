const Project = require('../models/Project');
const Task = require('../models/Task');
const Log = require('../models/Log');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @desc    Get all projects (admin: all, others: their projects)
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
  let query = {};

  if (req.user.role !== 'admin') {
    query = {
      $or: [{ manager: req.user._id }, { members: req.user._id }],
    };
  }

  const projects = await Project.find(query)
    .populate('manager', 'name email avatar color role')
    .populate('members', 'name email avatar color role')
    .sort('-createdAt');

  // Attach task counts
  const projectsWithCounts = await Promise.all(
    projects.map(async (p) => {
      const [total, done, inProgress, todo] = await Promise.all([
        Task.countDocuments({ project: p._id }),
        Task.countDocuments({ project: p._id, status: 'done' }),
        Task.countDocuments({ project: p._id, status: 'in-progress' }),
        Task.countDocuments({ project: p._id, status: 'todo' }),
      ]);
      return { ...p.toObject(), taskCounts: { total, done, inProgress, todo } };
    })
  );

  res.json({ success: true, count: projects.length, projects: projectsWithCounts });
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('manager', 'name email avatar color role')
    .populate('members', 'name email avatar color role');

  if (!project) throw new ApiError('Project not found', 404);

  // Check access
  if (req.user.role !== 'admin') {
    const isMember = project.members.some((m) => m._id.toString() === req.user._id.toString());
    const isManager = project.manager._id.toString() === req.user._id.toString();
    if (!isMember && !isManager) {
      throw new ApiError('Access denied', 403);
    }
  }

  const tasks = await Task.find({ project: project._id })
    .populate('assignee', 'name avatar color')
    .populate('createdBy', 'name avatar color')
    .sort('createdAt');

  res.json({ success: true, project, tasks });
});

// @desc    Create project
// @route   POST /api/projects
// @access  Private/Admin/Manager
const createProject = asyncHandler(async (req, res) => {
  const { name, description, color, members } = req.body;

  // Ensure manager is in members
  const memberList = members || [];
  if (!memberList.includes(req.user._id.toString())) {
    memberList.push(req.user._id.toString());
  }

  const project = await Project.create({
    name,
    description,
    color: color || '#6366f1',
    manager: req.user._id,
    members: memberList,
  });

  await project.populate('manager', 'name email avatar color role');
  await project.populate('members', 'name email avatar color role');

  // Log
  await Log.create({
    user: req.user._id,
    action: 'Created project',
    target: project.name,
    targetType: 'project',
    project: project._id,
  });

  // Broadcast via WebSocket
  req.app.locals.broadcast({
    type: 'project_created',
    payload: { project, user: req.user.name },
  });

  res.status(201).json({ success: true, project });
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private/Admin/Manager
const updateProject = asyncHandler(async (req, res) => {
  let project = await Project.findById(req.params.id);
  if (!project) throw new ApiError('Project not found', 404);

  // Only admin or project manager can update
  if (req.user.role !== 'admin' && project.manager.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized to update this project', 403);
  }

  const { name, description, color, members, status } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (color !== undefined) updates.color = color;
  if (members !== undefined) updates.members = members;
  if (status !== undefined) updates.status = status;

  project = await Project.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })
    .populate('manager', 'name email avatar color role')
    .populate('members', 'name email avatar color role');

  // Log
  await Log.create({
    user: req.user._id,
    action: 'Updated project',
    target: project.name,
    targetType: 'project',
    project: project._id,
  });

  req.app.locals.broadcast({
    type: 'project_updated',
    payload: { project, user: req.user.name },
  });

  res.json({ success: true, project });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private/Admin
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError('Project not found', 404);

  // Delete all tasks in project
  await Task.deleteMany({ project: project._id });
  await project.deleteOne();

  await Log.create({
    user: req.user._id,
    action: 'Deleted project',
    target: project.name,
    targetType: 'project',
  });

  req.app.locals.broadcast({
    type: 'project_deleted',
    payload: { projectId: req.params.id, projectName: project.name, user: req.user.name },
  });

  res.json({ success: true, message: 'Project deleted' });
});

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private/Admin/Manager
const addMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError('Project not found', 404);

  if (project.members.includes(userId)) {
    throw new ApiError('User is already a member', 400);
  }

  project.members.push(userId);
  await project.save();
  await project.populate('members', 'name email avatar color role');

  res.json({ success: true, project });
});

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private/Admin/Manager
const removeMember = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError('Project not found', 404);

  project.members = project.members.filter(
    (m) => m.toString() !== req.params.userId
  );
  await project.save();

  res.json({ success: true, message: 'Member removed' });
});

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember };
