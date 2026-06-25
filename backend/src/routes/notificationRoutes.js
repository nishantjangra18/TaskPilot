const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Protect all routes

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead); // Note: Put read-all before :id/read to prevent route matching conflicts
router.put('/:id/read', markAsRead);

module.exports = router;
