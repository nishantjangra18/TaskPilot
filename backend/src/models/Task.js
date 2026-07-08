const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userAvatar: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const attachmentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  size: {
    type: String,
  },
  type: {
    type: String,
  },
  uploadDate: {
    type: String,
  },
  url: {
    type: String,
  },
  fileName: {
    type: String,
  },
  originalName: {
    type: String,
  },
  fileSize: {
    type: String,
  },
  fileType: {
    type: String,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  },
});

const taskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please add a task title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'Description cannot exceed 300 characters'],
  },
  taskType: {
    type: String,
    default: 'feature',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo',
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  dueDate: {
    type: String, // Kept as String matching frontend format 'YYYY-MM-DD'
  },
  dueTime: {
    type: String, // Kept as String matching frontend format 'HH:MM'
  },
  milestone: {
    type: String,
    trim: true,
    default: '',
  },
  phase: {
    type: String,
    trim: true,
    default: '',
  },
  epic: {
    type: String,
    trim: true,
    default: '',
  },
  estimatedHours: {
    type: Number,
    default: 0,
  },
  dependencies: [{
    type: String,
    trim: true,
  }],
  subtasks: [{
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
    estimatedHours: { type: Number, default: 0 },
  }],  attachments: [attachmentSchema],
  comments: [commentSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Task', taskSchema);
