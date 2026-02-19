const express = require('express');
const router = express.Router();
const { getTasks, getTask, createTask, updateTask, deleteTask, getStats } = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getStats);
router.get('/', getTasks);
router.post('/', authorize('admin', 'manager'), createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', authorize('admin', 'manager'), deleteTask);

module.exports = router;
