const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/,
      'Please add a valid email address',
    ],
  },
  password: {
    type: String,
    required: function () {
      return this.provider !== 'google.com';
    },
    minlength: 6,
    select: false,
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
    default: undefined,
  },
  provider: {
    type: String,
    default: 'password',
  },
  avatar: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    default: '',
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light',
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcryptjs before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
