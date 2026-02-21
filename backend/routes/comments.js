const express = require('express');
const router = express.Router();
const {
  getComments,
  addComment,
  editComment,
  deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

// All comment routes require login
router.use(protect);

// GET all comments for a task / POST new comment
router.get('/:taskId', getComments);
router.post('/:taskId', addComment);

// Edit / Delete a specific comment
router.put('/:commentId', editComment);
router.delete('/:commentId', deleteComment);

module.exports = router;
