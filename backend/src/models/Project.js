const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a project name'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  theme: {
    type: String,
    default: '#3b82f6',
  },
  icon: {
    type: String,
    default: 'folder',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  deadline: {
    type: String,
    default: null,
  },
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private',
  },
  category: {
    type: String,
    trim: true,
    default: '',
  },
  techStack: [{
    type: String,
    trim: true,
  }],
  timeline: {
    type: String,
    trim: true,
    default: '',
  },
  goals: [{
    type: String,
    trim: true,
  }],
  milestones: [{
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    dueDate: { type: String, default: null },
    phase: { type: String, trim: true },
  }],
  aiMetadata: {
    generatedBy: { type: String, default: null },
    riskAnalysis: [{
      title: { type: String, trim: true },
      level: { type: String, trim: true },
      mitigation: { type: String, trim: true },
    }],
    estimatedHours: { type: Number, default: 0 },
    createdFromAI: { type: Boolean, default: false },
  },  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Project', projectSchema);
