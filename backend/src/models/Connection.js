const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending',
  },
  message: {
    type: String,
    trim: true,
    maxlength: 240,
    default: '',
  },
  acceptedAt: {
    type: Date,
    default: null,
  },
  declinedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

connectionSchema.index({ sender: 1, receiver: 1 }, { unique: true });
connectionSchema.index({ sender: 1, status: 1 });
connectionSchema.index({ receiver: 1, status: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
