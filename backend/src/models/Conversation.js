const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'project'],
    required: true,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  lastMessage: {
    text: {
      type: String,
      default: '',
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: null,
    },
  },
}, {
  timestamps: true,
});

conversationSchema.index({ type: 1, participants: 1 });
conversationSchema.index({ type: 1, projectId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Conversation', conversationSchema);
