const express = require('express');
const router = express.Router();
const {
  sendInvitation,
  getPendingInvitations,
  acceptInvitation,
  rejectInvitation
} = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Protect all routes

router.post('/', sendInvitation);
router.get('/pending', getPendingInvitations);
router.put('/:id/accept', acceptInvitation);
router.put('/:id/reject', rejectInvitation);

module.exports = router;
