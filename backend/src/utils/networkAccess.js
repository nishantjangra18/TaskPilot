const Connection = require('../models/Connection');

const normalizeId = value => (value?._id || value?.id || value)?.toString();

const areAcceptedConnections = async (userA, userB) => {
  const first = normalizeId(userA);
  const second = normalizeId(userB);
  if (!first || !second) return false;
  if (first === second) return true;

  const connection = await Connection.findOne({
    status: 'accepted',
    $or: [
      { sender: first, receiver: second },
      { sender: second, receiver: first },
    ],
  }).select('_id');

  return Boolean(connection);
};

const getAcceptedConnectionIds = async (userId) => {
  const currentId = normalizeId(userId);
  if (!currentId) return [];

  const connections = await Connection.find({
    status: 'accepted',
    $or: [{ sender: currentId }, { receiver: currentId }],
  }).select('sender receiver');

  return connections.map(connection => {
    const senderId = normalizeId(connection.sender);
    const receiverId = normalizeId(connection.receiver);
    return senderId === currentId ? receiverId : senderId;
  }).filter(Boolean);
};

module.exports = {
  areAcceptedConnections,
  getAcceptedConnectionIds,
  normalizeId,
};
