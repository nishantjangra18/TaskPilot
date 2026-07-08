const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Intermediate',
  },
  experience: {
    type: String,
    enum: ['', '0-1', '1-2', '2-4', '4-6', '6+'],
    default: '',
  },
}, { _id: false });

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
  username: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    unique: true,
    maxlength: 40,
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
  availability: {
    type: String,
    enum: ['available', 'busy', 'dnd', 'offline'],
    default: 'available',
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light',
  },
  skills: {
    type: [skillSchema],
    default: [],
    validate: {
      validator: skills => skills.length <= 50,
      message: 'A profile can include up to 50 skills',
    },
  },
  capacity: {
    type: Number,
    min: 0,
    max: 80,
    default: 40,
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

