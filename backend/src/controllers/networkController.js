const mongoose = require('mongoose');
const Connection = require('../models/Connection');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { createAndEmitNotification } = require('../utils/realtimeNotifications');
const { normalizeId } = require('../utils/networkAccess');

const USER_SELECT = 'name email username avatar title availability skills capacity createdAt';

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const shapeSkillNames = user => (user.skills || []).map(skill => skill.name).filter(Boolean);

const getDisplayUser = (user, stats = {}, extra = {}) => {
  const skillNames = shapeSkillNames(user);
  const completedTasks = stats.completedTasks || 0;
  const totalTasks = stats.totalTasks || 0;
  const reliabilityScore = totalTasks ? Math.min(99, Math.round((completedTasks / totalTasks) * 100)) : 92;

  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username || (user.email ? user.email.split('@')[0] : ''),
    avatar: user.avatar,
    title: user.title || 'Contributor',
    role: user.title || 'Contributor',
    availability: user.availability || 'available',
    skills: user.skills || [],
    topSkills: skillNames.slice(0, 5),
    capacity: user.capacity ?? 40,
    workload: stats.workload ?? Math.min(100, Math.round(((stats.openTasks || 0) / Math.max(user.capacity || 40, 1)) * 100 * 4)),
    completedTasks,
    projects: stats.projects || 0,
    reliabilityScore,
    ...extra,
  };
};

const getStatsByUser = async (userIds = []) => {
  const ids = userIds.map(normalizeId).filter(Boolean);
  if (!ids.length) return new Map();

  const [projects, tasks] = await Promise.all([
    Project.find({ $or: [{ owner: { $in: ids } }, { members: { $in: ids } }] }).select('owner members'),
    Task.find({ assignee: { $in: ids } }).select('assignee status'),
  ]);

  const stats = new Map(ids.map(id => [id, { projects: 0, totalTasks: 0, completedTasks: 0, openTasks: 0 }]));

  projects.forEach(project => {
    const projectUserIds = new Set([normalizeId(project.owner), ...(project.members || []).map(normalizeId)].filter(Boolean));
    projectUserIds.forEach(id => {
      if (stats.has(id)) stats.get(id).projects += 1;
    });
  });

  tasks.forEach(task => {
    const assigneeId = normalizeId(task.assignee);
    if (!stats.has(assigneeId)) return;
    const userStats = stats.get(assigneeId);
    userStats.totalTasks += 1;
    if (task.status === 'done') userStats.completedTasks += 1;
    else userStats.openTasks += 1;
  });

  return stats;
};

const populateConnection = query => query
  .populate('sender', USER_SELECT)
  .populate('receiver', USER_SELECT);

const emitNetworkUpdate = (req, userIds = []) => {
  const io = req.app.get('io');
  if (!io) return;
  userIds.map(normalizeId).filter(Boolean).forEach(userId => {
    io.to(userId).emit('network_updated', { receivedAt: Date.now() });
  });
};

const shapeIncomingRequest = connection => ({
  _id: connection._id,
  id: connection._id,
  status: connection.status,
  message: connection.message,
  createdAt: connection.createdAt,
  sentAt: connection.createdAt,
  user: getDisplayUser(connection.sender),
});

const shapeOutgoingRequest = connection => ({
  _id: connection._id,
  id: connection._id,
  status: connection.status,
  message: connection.message,
  createdAt: connection.createdAt,
  sentAt: connection.createdAt,
  user: getDisplayUser(connection.receiver),
});
const getRelatedUserIds = async userId => {
  const records = await Connection.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: { $in: ['pending', 'accepted', 'blocked'] },
  }).select('sender receiver');

  return new Set(records.flatMap(record => [normalizeId(record.sender), normalizeId(record.receiver)]).filter(Boolean));
};

exports.getNetwork = async (req, res) => {
  try {
    const userId = req.user.id;
    const [accepted, incoming, outgoing] = await Promise.all([
      populateConnection(Connection.find({ status: 'accepted', $or: [{ sender: userId }, { receiver: userId }] }).sort({ acceptedAt: -1, updatedAt: -1 })),
      populateConnection(Connection.find({ receiver: userId, status: 'pending' }).sort({ createdAt: -1 })),
      populateConnection(Connection.find({ sender: userId, status: 'pending' }).sort({ createdAt: -1 })),
    ]);

    const connectedUsers = accepted.map(connection => normalizeId(connection.sender) === userId ? connection.receiver : connection.sender).filter(Boolean);
    const stats = await getStatsByUser(connectedUsers.map(user => user._id));

    const connections = accepted.map(connection => {
      const otherUser = normalizeId(connection.sender) === userId ? connection.receiver : connection.sender;
      return getDisplayUser(otherUser, stats.get(normalizeId(otherUser)) || {}, {
        connectionId: connection._id,
        connectionSince: connection.acceptedAt || connection.updatedAt,
      });
    });

    res.json({
      success: true,
      data: {
        connections,
        incoming: incoming.map(shapeIncomingRequest),
        outgoing: outgoing.map(shapeOutgoingRequest),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.discoverUsers = async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    if (query.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const relatedUserIds = await getRelatedUserIds(req.user.id);
    relatedUserIds.add(req.user.id);

    const regex = new RegExp(escapeRegex(query), 'i');
    const users = await User.find({
      _id: { $nin: Array.from(relatedUserIds) },
      $or: [
        { name: regex },
        { username: regex },
        { email: regex },
        { title: regex },
        { 'skills.name': regex },
        { 'skills.category': regex },
      ],
    }).select(USER_SELECT).limit(12);

    const connectionIds = await Connection.find({ status: 'accepted', $or: [{ sender: req.user.id }, { receiver: req.user.id }] }).select('sender receiver');
    const myConnectionSet = new Set(connectionIds.map(connection => normalizeId(connection.sender) === req.user.id ? normalizeId(connection.receiver) : normalizeId(connection.sender)));
    const resultStats = await getStatsByUser(users.map(user => user._id));

    const mutualConnectionCounts = await Promise.all(users.map(async user => {
      const userConnections = await Connection.find({ status: 'accepted', $or: [{ sender: user._id }, { receiver: user._id }] }).select('sender receiver');
      return userConnections.reduce((count, connection) => {
        const otherId = normalizeId(connection.sender) === normalizeId(user) ? normalizeId(connection.receiver) : normalizeId(connection.sender);
        return myConnectionSet.has(otherId) ? count + 1 : count;
      }, 0);
    }));

    res.json({
      success: true,
      data: users.map((user, index) => getDisplayUser(user, resultStats.get(normalizeId(user)) || {}, {
        mutualConnections: mutualConnectionCounts[index] || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select(USER_SELECT);
    const relatedUserIds = await getRelatedUserIds(req.user.id);
    relatedUserIds.add(req.user.id);

    const skillNames = (currentUser.skills || []).map(skill => skill.name).filter(Boolean);
    const skillRegexes = skillNames.map(name => new RegExp(escapeRegex(name), 'i'));
    const query = skillRegexes.length
      ? { $or: [{ 'skills.name': { $in: skillRegexes } }, { 'skills.category': { $in: skillRegexes } }, { title: { $in: skillRegexes } }] }
      : {};

    const users = await User.find({
      _id: { $nin: Array.from(relatedUserIds) },
      ...query,
    }).select(USER_SELECT).limit(8);

    const stats = await getStatsByUser(users.map(user => user._id));
    res.json({
      success: true,
      data: users.map(user => getDisplayUser(user, stats.get(normalizeId(user)) || {}, {
        recommendationReason: skillNames.some(skill => shapeSkillNames(user).some(userSkill => userSkill.toLowerCase() === skill.toLowerCase()))
          ? 'Similar skills'
          : 'Professional match',
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendConnectionRequest = async (req, res) => {
  try {
    const { receiverId, message = '' } = req.body;
    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, message: 'A valid user is required' });
    }
    if (receiverId.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot connect with yourself' });
    }

    const receiver = await User.findById(receiverId).select(USER_SELECT);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existing = await Connection.findOne({
      $or: [
        { sender: req.user.id, receiver: receiverId },
        { sender: receiverId, receiver: req.user.id },
      ],
      status: { $in: ['pending', 'accepted', 'blocked'] },
    });

    if (existing) {
      const statusCopy = existing.status === 'accepted' ? 'already connected' : 'already pending';
      return res.status(400).json({ success: false, message: `Connection request is ${statusCopy}` });
    }

    const connection = await Connection.create({
      sender: req.user.id,
      receiver: receiverId,
      status: 'pending',
      message: String(message || '').trim().slice(0, 240),
    });

    await createAndEmitNotification(req, {
      userId: receiverId,
      type: 'connection_request_received',
      message: `${req.user.name} sent you a connection request.`,
      metadata: { connectionId: normalizeId(connection._id), senderId: req.user.id, link: '/network', networkTab: 'requests', requestList: 'incoming' },
    });

    emitNetworkUpdate(req, [req.user.id, receiverId]);
    const populated = await populateConnection(Connection.findById(connection._id));
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.acceptConnectionRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);
    if (!connection) return res.status(404).json({ success: false, message: 'Connection request not found' });
    if (normalizeId(connection.receiver) !== req.user.id) return res.status(403).json({ success: false, message: 'You can only accept requests sent to you' });
    if (connection.status !== 'pending') return res.status(400).json({ success: false, message: `Connection request is already ${connection.status}` });

    connection.status = 'accepted';
    connection.acceptedAt = new Date();
    await connection.save();

    await createAndEmitNotification(req, {
      userId: connection.sender,
      type: 'connection_accepted',
      message: `${req.user.name} accepted your connection request.`,
      metadata: { connectionId: normalizeId(connection._id), userId: req.user.id, link: '/network', networkTab: 'requests' },
    });

    emitNetworkUpdate(req, [connection.sender, connection.receiver]);
    const populated = await populateConnection(Connection.findById(connection._id));
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.declineConnectionRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);
    if (!connection) return res.status(404).json({ success: false, message: 'Connection request not found' });
    if (normalizeId(connection.receiver) !== req.user.id) return res.status(403).json({ success: false, message: 'You can only decline requests sent to you' });
    if (connection.status !== 'pending') return res.status(400).json({ success: false, message: `Connection request is already ${connection.status}` });

    connection.status = 'declined';
    connection.declinedAt = new Date();
    await connection.save();

    await createAndEmitNotification(req, {
      userId: connection.sender,
      type: 'connection_declined',
      message: `${req.user.name} declined your connection request.`,
      metadata: { connectionId: normalizeId(connection._id), userId: req.user.id, link: '/network', networkTab: 'requests' },
    });

    emitNetworkUpdate(req, [connection.sender, connection.receiver]);
    res.json({ success: true, data: connection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelConnectionRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);
    if (!connection) return res.status(404).json({ success: false, message: 'Connection request not found' });
    if (normalizeId(connection.sender) !== req.user.id) return res.status(403).json({ success: false, message: 'You can only cancel your own requests' });
    if (connection.status !== 'pending') return res.status(400).json({ success: false, message: `Connection request is already ${connection.status}` });

    await connection.deleteOne();
    emitNetworkUpdate(req, [connection.sender, connection.receiver]);
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getIncomingConnectionRequests = async (req, res) => {
  try {
    const incoming = await populateConnection(
      Connection.find({ receiver: req.user.id, status: 'pending' }).sort({ createdAt: -1 })
    );
    res.json({ success: true, count: incoming.length, data: incoming.map(shapeIncomingRequest) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOutgoingConnectionRequests = async (req, res) => {
  try {
    const outgoing = await populateConnection(
      Connection.find({ sender: req.user.id, status: 'pending' }).sort({ createdAt: -1 })
    );
    res.json({ success: true, count: outgoing.length, data: outgoing.map(shapeOutgoingRequest) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
