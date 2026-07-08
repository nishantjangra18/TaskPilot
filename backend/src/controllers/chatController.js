const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Project = require('../models/Project');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const { createAndEmitNotification, findMentionedUsers, normalizeId } = require('../utils/realtimeNotifications');
const { areAcceptedConnections } = require('../utils/networkAccess');

const getUserId = (req) => req.user.id.toString();

const isProjectMember = (project, userId) => {
  const ownerId = project.owner?._id || project.owner;
  const memberIds = (project.members || []).map(member => (member._id || member).toString());
  return ownerId?.toString() === userId || memberIds.includes(userId);
};

const getProjectParticipantIds = (project) => {
  const getId = (value) => value?._id?.toString() || value?.toString();
  const ids = [
    getId(project.owner),
    ...(project.members || []).map(member => getId(member)),
  ].filter(Boolean);
  return [...new Set(ids)];
};

const getProjectMembershipStart = async (project, userId) => {
  const ownerId = project.owner?._id || project.owner;
  if (ownerId?.toString() === userId) {
    return project.createdAt || new Date(0);
  }

  const acceptedInvitation = await Invitation.findOne({
    projectId: project._id,
    receiverId: userId,
    status: 'accepted',
    respondedAt: { $exists: true },
  }).sort({ respondedAt: -1 });

  return acceptedInvitation?.respondedAt || project.createdAt || new Date(0);
};

const getVisibleMessageFilter = async (conversation, userId) => {
  const filter = { conversationId: conversation._id };

  if (conversation.type !== 'project') {
    return filter;
  }

  const projectId = conversation.projectId?._id || conversation.projectId;
  const project = await Project.findById(projectId);
  if (!project) {
    return filter;
  }

  const joinedAt = await getProjectMembershipStart(project, userId);
  return { ...filter, createdAt: { $gte: joinedAt } };
};

const syncProjectConversation = async (project) => {
  return Conversation.findOneAndUpdate(
    { type: 'project', projectId: project._id },
    {
      type: 'project',
      projectId: project._id,
      participants: getProjectParticipantIds(project),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const populateConversation = (query) => query
  .populate('participants', 'name email avatar title')
  .populate('projectId', 'name color theme icon');

const shapeConversation = async (conversation, userId) => {
  const visibleMessageFilter = await getVisibleMessageFilter(conversation, userId);
  const unreadCount = await Message.countDocuments({
    ...visibleMessageFilter,
    senderId: { $ne: userId },
    readBy: { $ne: userId },
  });

  let lastMessage = conversation.lastMessage;
  if (conversation.type === 'project' && lastMessage?.createdAt) {
    const joinedAt = visibleMessageFilter.createdAt?.$gte;
    if (joinedAt && new Date(lastMessage.createdAt) < new Date(joinedAt)) {
      const visibleLastMessage = await Message.findOne(visibleMessageFilter)
        .sort({ createdAt: -1 })
        .select('text senderId createdAt');
      lastMessage = visibleLastMessage
        ? {
            text: visibleLastMessage.text,
            senderId: visibleLastMessage.senderId,
            createdAt: visibleLastMessage.createdAt,
          }
        : undefined;
    }
  }

  return {
    ...conversation.toObject(),
    lastMessage,
    unreadCount,
  };
};

const requireConversationAccess = async (conversationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return { status: 404, message: 'Conversation not found' };
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return { status: 404, message: 'Conversation not found' };
  }

  if (!conversation.participants.some(participant => participant.toString() === userId)) {
    return { status: 403, message: 'Forbidden' };
  }

  if (conversation.type === 'project') {
    const projectId = conversation.projectId?._id || conversation.projectId;
    const project = await Project.findById(projectId);
    if (!project || !isProjectMember(project, userId)) {
      return { status: 403, message: 'Forbidden' };
    }
    await syncProjectConversation(project);
  }

  return { conversation };
};

exports.getChats = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversations = await populateConversation(
      Conversation.find({ participants: userId }).sort({ updatedAt: -1 })
    );

    const shaped = await Promise.all(conversations.map(conversation => shapeConversation(conversation, userId)));
    res.json({ success: true, count: shaped.length, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDirectChat = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { participantId } = req.body;

    if (!participantId || !mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ success: false, message: 'A valid participant ID is required' });
    }

    if (participantId.toString() === userId) {
      return res.status(400).json({ success: false, message: 'You cannot start a direct message with yourself' });
    }

    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isConnected = await areAcceptedConnections(userId, participantId);
    if (!isConnected) {
      return res.status(403).json({ success: false, message: 'You can only message accepted connections' });
    }

    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [userId, participantId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [userId, participantId],
      });
    }

    conversation = await populateConversation(Conversation.findById(conversation._id));
    res.status(201).json({ success: true, data: await shapeConversation(conversation, userId) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectChat = async (req, res) => {
  try {
    const userId = getUserId(req);
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!isProjectMember(project, userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const conversation = await syncProjectConversation(project);
    const populated = await populateConversation(Conversation.findById(conversation._id));

    res.json({ success: true, data: await shapeConversation(populated, userId) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = getUserId(req);
    const access = await requireConversationAccess(req.params.id, userId);

    if (!access.conversation) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const visibleMessageFilter = await getVisibleMessageFilter(access.conversation, userId);

    await Message.updateMany(
      { ...visibleMessageFilter, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    const messages = await Message.find(visibleMessageFilter)
      .populate('senderId', 'name email avatar title')
      .sort({ createdAt: 1 });

    res.json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { text, attachments } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const access = await requireConversationAccess(req.params.id, userId);
    if (!access.conversation) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    if (access.conversation.type === 'direct') {
      const recipientId = access.conversation.participants.map(participant => participant.toString()).find(participant => participant !== userId);
      const isConnected = await areAcceptedConnections(userId, recipientId);
      if (!isConnected) {
        return res.status(403).json({ success: false, message: 'You can only message accepted connections' });
      }
    }

    const message = await Message.create({
      conversationId: access.conversation._id,
      senderId: userId,
      text: text.trim(),
      attachments: attachments || [],
      readBy: [userId],
    });

    access.conversation.lastMessage = {
      text: message.text,
      senderId: userId,
      createdAt: message.createdAt,
    };
    await access.conversation.save();

    const populatedMessage = await Message.findById(message._id).populate('senderId', 'name email avatar title');
    const populatedConversation = await populateConversation(Conversation.findById(access.conversation._id));
    const io = req.app.get('io');    if (io) {
      for (const participantId of access.conversation.participants) {
        const recipientId = participantId.toString();
        io.to(recipientId).emit('chat_message', {
          conversationId: access.conversation._id.toString(),
          message: populatedMessage,
        });
        io.to(recipientId).emit('chat_updated', await shapeConversation(populatedConversation, recipientId));
      }
    }

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.syncProjectConversation = syncProjectConversation;


