const express = require('express');
const router = express.Router();
const {
  getChats,
  createDirectChat,
  getMessages,
  sendMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getChats);

router.post('/direct', createDirectChat);

router.route('/:id/messages')
  .get(getMessages)
  .post(sendMessage);

module.exports = router;
