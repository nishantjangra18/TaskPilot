const Notification = require('../models/Notification');
const User = require('../models/User');

const normalizeId = (value) => (value?._id || value?.id || value)?.toString();

const createAndEmitNotification = async (req, { userId, type, message, metadata = {}, realtimeEvent = null }) => {
  if (!userId || userId.toString() === req.user.id) return null;

  const notification = await Notification.create({
    userId,
    type,
    message,
    metadata,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(userId.toString()).emit('notification_received', notification);
    if (realtimeEvent) {
      io.to(userId.toString()).emit(realtimeEvent, {
        type,
        message,
        metadata,
        notification,
      });
    }
  }

  return notification;
};

const findMentionedUsers = async (text, allowedUserIds = []) => {
  if (!text || !allowedUserIds.length) return [];

  const users = await User.find({ _id: { $in: allowedUserIds } }).select('name email avatar title');
  const loweredText = text.toLowerCase();

  return users.filter((user) => {
    const emailToken = `@${user.email}`.toLowerCase();
    const compactNameToken = `@${user.name}`.toLowerCase().replace(/\s+/g, '');
    const firstNameToken = `@${user.name.split(' ')[0]}`.toLowerCase();

    return loweredText.includes(emailToken) ||
      loweredText.includes(compactNameToken) ||
      loweredText.includes(firstNameToken);
  });
};

const uniqueIds = (ids) => [...new Set(ids.map(normalizeId).filter(Boolean))];

module.exports = {
  createAndEmitNotification,
  findMentionedUsers,
  normalizeId,
  uniqueIds,
};
