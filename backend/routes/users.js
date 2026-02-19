const express = require('express');
const router = express.Router();
const { getUsers, getUser, updateUser, deleteUser, getUserStats } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', authorize('admin'), deleteUser);
router.get('/:id/stats', getUserStats);

module.exports = router;
