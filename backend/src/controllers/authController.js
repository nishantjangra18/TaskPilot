const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');
const { verifyFirebaseIdToken } = require('../config/firebaseAdmin');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const serializeUser = (user, includeToken = true) => ({
  _id: user._id,
  uid: user.firebaseUid,
  name: user.name,
  displayName: user.name,
  email: user.email,
  avatar: user.avatar,
  photoURL: user.avatar,
  title: user.title,
  theme: user.theme,
  provider: user.provider,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
  lastLogin: user.lastLogin,
  ...(includeToken ? { token: generateToken(user._id) } : {}),
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, avatar, title, theme } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      avatar: avatar || null,
      title: title || '',
      theme: theme || 'light',
      provider: 'password',
      lastLogin: new Date(),
    });

    if (user) {
      res.status(201).json({ success: true, data: serializeUser(user) });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

    if (user && (await user.matchPassword(password))) {
      user.lastLogin = new Date();
      await user.save();
      res.json({ success: true, data: serializeUser(user) });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate or create a user with Firebase Google Auth
// @route   POST /api/auth/firebase-google
// @access  Public
exports.firebaseGoogleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase ID token is required' });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const email = decoded.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account does not include an email address' });
    }

    let user = await User.findOne({ $or: [{ firebaseUid: decoded.uid }, { email }] });
    const now = new Date();

    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        name: decoded.name || email.split('@')[0],
        email,
        avatar: decoded.picture || null,
        title: '',
        provider: decoded.firebase?.sign_in_provider || 'google.com',
        emailVerified: Boolean(decoded.email_verified),
        lastLogin: now,
        theme: 'light',
      });
    } else {
      user.firebaseUid = user.firebaseUid || decoded.uid;
      user.name = user.name || decoded.name || email.split('@')[0];
      user.avatar = decoded.picture || user.avatar;
      user.provider = decoded.firebase?.sign_in_provider || user.provider || 'google.com';
      user.emailVerified = Boolean(decoded.email_verified);
      user.lastLogin = now;
      await user.save();
    }

    res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    const message = error.message?.includes('Firebase Admin is not configured')
      ? error.message
      : 'Firebase Google authentication failed';
    res.status(401).json({ success: false, message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      res.json({ success: true, data: serializeUser(user, false) });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;
      user.title = req.body.title !== undefined ? req.body.title : user.title;
      user.theme = req.body.theme !== undefined ? req.body.theme : user.theme;

      const updatedUser = await user.save();

      res.json({ success: true, data: serializeUser(updatedUser, false) });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get searchable workspace users
// @route   GET /api/auth/users
// @access  Private
exports.getUsers = async (req, res) => {
  try {
    const { email } = req.query;
    const normalizedEmail = email?.trim().toLowerCase();

    if (normalizedEmail) {
      if (normalizedEmail.length < 5 || !normalizedEmail.includes('@')) {
        return res.json({ success: true, data: [] });
      }

      const user = await User.findOne({ email: normalizedEmail }).select('name email avatar title');
      return res.json({ success: true, data: user ? [user] : [] });
    }

    const projects = await Project.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    }).select('owner members');

    const allowedUserIds = new Set([req.user.id.toString()]);
    projects.forEach(project => {
      if (project.owner) allowedUserIds.add(project.owner.toString());
      (project.members || []).forEach(memberId => allowedUserIds.add(memberId.toString()));
    });

    const users = await User.find({ _id: { $in: Array.from(allowedUserIds) } }).select('name email avatar title');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
