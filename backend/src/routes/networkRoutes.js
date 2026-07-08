const express = require('express');
const router = express.Router();
const {
  getNetwork,
  discoverUsers,
  getSuggestions,
  getIncomingConnectionRequests,
  getOutgoingConnectionRequests,
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
} = require('../controllers/networkController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNetwork);
router.get('/discover', discoverUsers);
router.get('/suggestions', getSuggestions);
router.get('/requests/incoming', getIncomingConnectionRequests);
router.get('/requests/outgoing', getOutgoingConnectionRequests);
router.post('/request', sendConnectionRequest);
router.post('/requests', sendConnectionRequest);
router.post('/request/:id/accept', acceptConnectionRequest);
router.put('/requests/:id/accept', acceptConnectionRequest);
router.post('/request/:id/decline', declineConnectionRequest);
router.put('/requests/:id/decline', declineConnectionRequest);
router.delete('/requests/:id', cancelConnectionRequest);

module.exports = router;

