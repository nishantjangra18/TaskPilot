const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getActivityLogs
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { getProjectChat } = require('../controllers/chatController');

router.use(protect); // Protect all routes in this router

router.route('/')
  .post(createProject)
  .get(getProjects);

router.get('/logs', getActivityLogs);
router.get('/:id/chat', getProjectChat);

router.route('/:id')
  .get(getProjectById)
  .put(updateProject)
  .delete(deleteProject);

module.exports = router;
