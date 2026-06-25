const mongoose = require('mongoose');

const meetingParticipantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  leftAt: {
    type: Date,
    default: null,
  },
}, { _id: false });

const meetingSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  meetingId: {
    type: String,
    required: true,
    unique: true,
  },
  videoSdkRoomId: {
    type: String,
    default: '',
  },
  provider: {
    type: String,
    enum: ['videosdk', 'scheduled'],
    default: 'videosdk',
  },
  title: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  scheduledDate: {
    type: String,
    default: '',
  },
  startTime: {
    type: String,
    default: '',
  },
  endTime: {
    type: String,
    default: '',
  },
  startsAt: {
    type: Date,
    default: null,
    index: true,
  },
  endsAt: {
    type: Date,
    default: null,
  },
  meetingType: {
    type: String,
    enum: ['video', 'audio', 'planning', 'review', 'standup', 'other'],
    default: 'video',
  },
  recurrence: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none',
  },
  jitsiRoom: {
    type: String,
    default: '',
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'upcoming', 'live', 'completed', 'cancelled', 'active', 'ended'],
    default: 'live',
    index: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
    default: null,
  },
  duration: {
    type: Number,
    default: 0,
  },
  participants: [meetingParticipantSchema],
  scheduledParticipants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
}, {
  timestamps: true,
});

meetingSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);

