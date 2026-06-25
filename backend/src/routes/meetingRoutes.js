const express = require('express');
const router = express.Router();
const {
  getMeetings,
  getActiveMeetings,
  getActiveProjectMeeting,
  startProjectMeeting,
  startScheduledMeeting,
  scheduleProjectMeeting,
  updateScheduledMeeting,
  cancelMeeting,
  joinMeeting,
  leaveMeeting,
  endMeeting,
} = require('../controllers/meetingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMeetings);
router.get('/active', getActiveMeetings);
router.get('/project/:projectId/active', getActiveProjectMeeting);
router.post('/project/:projectId/start', startProjectMeeting);
router.post('/project/:projectId/schedule', scheduleProjectMeeting);
router.put('/:id', updateScheduledMeeting);
router.post('/:id/start', startScheduledMeeting);
router.post('/:id/cancel', cancelMeeting);
router.post('/:id/join', joinMeeting);
router.post('/:id/leave', leaveMeeting);
router.post('/:id/end', endMeeting);

module.exports = router;




