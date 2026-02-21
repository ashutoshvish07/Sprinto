const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Log = require('../models/Log');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// @desc    Get all comments for a task
// @route   GET /api/comments/:taskId
// @access  Private
const getComments = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  // Verify task exists
  const task = await Task.findById(taskId);
  if (!task) throw new ApiError('Task not found', 404);

  const comments = await Comment.find({ task: taskId })
    .populate('author', 'name avatar color email')
    .sort('createdAt'); // oldest first

  res.json({ success: true, count: comments.length, comments });
});

// @desc    Add a comment to a task
// @route   POST /api/comments/:taskId
// @access  Private (all roles)
const addComment = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    throw new ApiError('Comment text is required', 400);
  }

  // Verify task exists
  const task = await Task.findById(taskId).populate('project', 'name');
  if (!task) throw new ApiError('Task not found', 404);

  const comment = await Comment.create({
    task: taskId,
    author: req.user._id,
    text: text.trim(),
  });

  await comment.populate('author', 'name avatar color email');

  // Log the activity
  await Log.create({
    user: req.user._id,
    action: 'Commented on task',
    target: task.title,
    targetType: 'task',
    project: task.project?._id || task.project,
  });

  // Broadcast via WebSocket
  req.app.locals.broadcast({
    type: 'comment_added',
    payload: {
      comment,
      taskId,
      taskTitle: task.title,
      user: req.user.name,
    },
  });

  res.status(201).json({ success: true, comment });
});

// @desc    Edit a comment
// @route   PUT /api/comments/:commentId
// @access  Private (author only or admin)
const editComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    throw new ApiError('Comment text is required', 400);
  }

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError('Comment not found', 404);

  // Only the author or admin can edit
  const isAuthor = comment.author.toString() === req.user._id.toString();
  if (!isAuthor && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to edit this comment', 403);
  }

  comment.text = text.trim();
  comment.edited = true;
  await comment.save();

  await comment.populate('author', 'name avatar color email');

  // Broadcast edit
  req.app.locals.broadcast({
    type: 'comment_edited',
    payload: { comment, taskId: comment.task },
  });

  res.json({ success: true, comment });
});

// @desc    Delete a comment
// @route   DELETE /api/comments/:commentId
// @access  Private (author or admin/manager)
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError('Comment not found', 404);

  // Author can delete their own, admin/manager can delete any
  const isAuthor = comment.author.toString() === req.user._id.toString();
  const isAdminOrManager = ['admin', 'manager'].includes(req.user.role);

  if (!isAuthor && !isAdminOrManager) {
    throw new ApiError('Not authorized to delete this comment', 403);
  }

  const taskId = comment.task;
  await comment.deleteOne();

  // Broadcast delete
  req.app.locals.broadcast({
    type: 'comment_deleted',
    payload: { commentId, taskId },
  });

  res.json({ success: true, message: 'Comment deleted' });
});

module.exports = { getComments, addComment, editComment, deleteComment };
