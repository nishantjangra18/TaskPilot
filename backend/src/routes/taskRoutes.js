const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Protect all routes in this router

router.route('/')
  .post(createTask)
  .get(getTasks);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.route('/:id/comments')
  .post(addComment);

module.exports = router;
