const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['invitation_received', 'invitation_accepted', 'invitation_rejected', 'connection_request_received', 'connection_accepted', 'connection_declined', 'meeting_started', 'meeting_scheduled', 'meeting_updated', 'meeting_cancelled', 'meeting_ended', 'task_assigned', 'task_status_changed', 'user_mentioned'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
