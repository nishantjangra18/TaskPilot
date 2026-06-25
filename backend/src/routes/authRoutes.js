const express = require('express');
const router = express.Router();
const { register, login, firebaseGoogleLogin, getProfile, updateProfile, getUsers } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/firebase-google', firebaseGoogleLogin);
router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);
router.get('/users', protect, getUsers);

module.exports = router;

