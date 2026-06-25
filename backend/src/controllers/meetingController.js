const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Meeting = require('../models/Meeting');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { syncProjectConversation } = require('./chatController');

const getVideoSdkToken = () => {
  const existingToken = process.env.VIDEOSDK_TOKEN || process.env.VIDEO_SDK_TOKEN;
  if (existingToken) return existingToken;

  const apiKey = process.env.VIDEOSDK_API_KEY || process.env.VIDEO_SDK_API_KEY;
  const secretKey = process.env.VIDEOSDK_SECRET_KEY || process.env.VIDEO_SDK_SECRET_KEY;
  if (!apiKey || !secretKey) return '';

  return jwt.sign(
    {
      apikey: apiKey,
      permissions: ['allow_join', 'allow_mod'],
      version: 2,
    },
    secretKey,
    {
      algorithm: 'HS256',
      expiresIn: '24h',
    }
  );
};

const formatDuration = (seconds = 0) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

const isProjectMember = (project, userId) => {
  const ownerId = project.owner?._id || project.owner;
  const memberIds = (project.members || []).map(member => (member._id || member).toString());
  return ownerId?.toString() === userId || memberIds.includes(userId);
};

const canManageMeeting = (project, userId) => {
  const ownerId = project.owner?._id || project.owner;
  return ownerId?.toString() === userId;
};

const getProjectParticipantIds = (project) => {
  const ids = [
    project.owner?.toString(),
    ...(project.members || []).map(member => member.toString()),
  ].filter(Boolean);
  return [...new Set(ids)];
};
const getMeetingState = (meeting) => {
  if (!meeting) return 'scheduled';
  if (meeting.status === 'active') return 'live';
  if (['completed', 'ended'].includes(meeting.status)) return 'ended';
  if (meeting.status === 'scheduled' && meeting.startsAt) {
    const now = Date.now();
    const startsAt = new Date(meeting.startsAt).getTime();
    if (!Number.isNaN(startsAt) && startsAt - now <= 60 * 60 * 1000 && startsAt > now) return 'upcoming';
  }
  return meeting.status || 'scheduled';
};

const parseScheduledDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getScopedParticipantIds = (project, requested = []) => {
  const projectParticipantIds = getProjectParticipantIds(project);
  const requestedIds = requested.map(id => id?.toString()).filter(Boolean);
  const scoped = requestedIds.filter(id => projectParticipantIds.includes(id));
  return scoped.length > 0 ? [...new Set(scoped)] : projectParticipantIds;
};

const toCalendarMeeting = (meeting) => {
  const doc = withVideoSdkToken(meeting);
  if (!doc) return doc;
  return { ...doc, state: getMeetingState(doc) };
};


const populateMeeting = (query) => query
  .populate('hostId', 'name email avatar title')
  .populate('participants.userId', 'name email avatar title')
  .populate('scheduledParticipants', 'name email avatar title')
  .populate('projectId', 'name color theme icon');

const withVideoSdkToken = (meeting) => {
  if (!meeting) return meeting;
  const doc = typeof meeting.toObject === 'function' ? meeting.toObject() : meeting;
  return {
    ...doc,
    videoSdkToken: getVideoSdkToken(),
  };
};

const emitMeetingUpdate = (req, project, eventName, meeting, extra = {}) => {
  const io = req.app.get('io');
  if (!io) return;

  const payload = withVideoSdkToken(meeting);
  getProjectParticipantIds(project).forEach(memberId => {
    io.to(memberId).emit(eventName, { ...payload, ...extra });
  });
};

const createVideoSdkRoom = async () => {
  const token = getVideoSdkToken();
  if (!token) {
    return `taskpilot-${crypto.randomUUID()}`.replace(/[^a-zA-Z0-9-]/g, '');
  }

  const response = await fetch('https://api.videosdk.live/v2/rooms', {
    method: 'POST',
    headers: {
      authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to create VideoSDK room');
  }

  const data = await response.json();
  return data.roomId;
};

const addProjectChatMessage = async (req, project, text, metadata = {}) => {
  const conversation = await syncProjectConversation(project);
  const message = await Message.create({
    conversationId: conversation._id,
    senderId: req.user.id,
    text,
    attachments: [],
    metadata,
    readBy: metadata.type === 'meeting' ? getProjectParticipantIds(project) : [req.user.id],
  });

  conversation.lastMessage = {
    text: message.text,
    senderId: req.user.id,
    createdAt: message.createdAt,
  };
  await conversation.save();

  const populatedMessage = await Message.findById(message._id).populate('senderId', 'name email avatar title');
  const populatedConversation = await Conversation.findById(conversation._id)
    .populate('participants', 'name email avatar title')
    .populate('projectId', 'name color theme icon');
  const io = req.app.get('io');

  if (io) {
    getProjectParticipantIds(project).forEach(memberId => {
      io.to(memberId).emit('chat_message', {
        conversationId: conversation._id.toString(),
        message: populatedMessage,
      });
      io.to(memberId).emit('chat_updated', populatedConversation);
    });
  }
};

exports.getMeetings = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    }).select('_id');

    const projectIds = projects.map(project => project._id);
    const meetings = await populateMeeting(
      Meeting.find({ projectId: { $in: projectIds }, provider: 'scheduled', status: { $ne: 'cancelled' } }).sort({ startsAt: 1, startedAt: -1, createdAt: -1 })
    );

    res.json({ success: true, count: meetings.length, data: meetings.map(toCalendarMeeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getActiveMeetings = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    }).select('_id');

    const projectIds = projects.map(project => project._id);
    const meetings = await populateMeeting(
      Meeting.find({ projectId: { $in: projectIds }, status: { $in: ['live', 'active'] } }).sort({ startedAt: -1 })
    );

    res.json({ success: true, count: meetings.length, data: meetings.map(toCalendarMeeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActiveProjectMeeting = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!isProjectMember(project, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const meeting = await populateMeeting(Meeting.findOne({ projectId: project._id, status: { $in: ['live', 'active'] } }));
    res.json({ success: true, data: toCalendarMeeting(meeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.startProjectMeeting = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!canManageMeeting(project, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can start meetings' });
    }

    const existingMeeting = await Meeting.findOne({ projectId: project._id, status: { $in: ['live', 'active'] } });
    if (existingMeeting) {
      const populatedExisting = await populateMeeting(Meeting.findById(existingMeeting._id));
      return res.json({ success: true, data: toCalendarMeeting(populatedExisting) });
    }

    const requestedTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const requestedDescription = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const meetingTitle = requestedTitle || project.name + ' Meeting';
    const videoSdkRoomId = await createVideoSdkRoom();
    let meeting = await Meeting.create({
      projectId: project._id,
      meetingId: videoSdkRoomId,
      videoSdkRoomId,
      jitsiRoom: '',
      provider: 'videosdk',
      title: meetingTitle,
      description: requestedDescription,
      status: 'live',
      startsAt: new Date(),
      hostId: req.user.id,
      participants: [{ userId: req.user.id, joinedAt: new Date() }],
      startedAt: new Date(),
    });

    await ActivityLog.create({
      projectId: project._id,
      userId: req.user.id,
      message: `started a meeting.`,
    });

    meeting = await populateMeeting(Meeting.findById(meeting._id));

    const participantIds = getProjectParticipantIds(project);
    const notifications = await Notification.insertMany(participantIds
      .filter(userId => userId !== req.user.id)
      .map(userId => ({
        userId,
        type: 'meeting_started',
        message: `${project.name}: ${meetingTitle} has started.`,
        metadata: {
          projectId: project._id.toString(),
          meetingId: meeting._id.toString(),
          link: `/projects/${project._id}/meeting`,
        },
      })));

    await addProjectChatMessage(req, project, `${String.fromCodePoint(0x1F3A5)} Meeting started: ${meetingTitle}`, {
      type: 'meeting',
      meetingId: meeting._id.toString(),
      projectId: project._id.toString(),
      title: meetingTitle,
      projectName: project.name,
      status: 'active',
      link: `/projects/${project._id}/meeting`,
    });

    const io = req.app.get('io');
    if (io) {
      notifications.forEach(notification => {
        io.to(notification.userId.toString()).emit('notification_received', notification);
      });
    }
    emitMeetingUpdate(req, project, 'meeting_started', meeting);

    res.status(201).json({ success: true, data: toCalendarMeeting(meeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.startScheduledMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting || meeting.provider !== 'scheduled' || meeting.status === 'cancelled') {
      return res.status(404).json({ success: false, message: 'Scheduled meeting not found' });
    }

    const project = await Project.findById(meeting.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (!canManageMeeting(project, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can start this meeting' });
    }
    if (['live', 'active'].includes(meeting.status)) {
      const populatedExisting = await populateMeeting(Meeting.findById(meeting._id));
      return res.json({ success: true, data: toCalendarMeeting(populatedExisting) });
    }
    if (['completed', 'ended'].includes(meeting.status)) {
      return res.status(400).json({ success: false, message: 'This meeting has ended' });
    }

    const activeMeeting = await Meeting.findOne({ projectId: project._id, status: { $in: ['live', 'active'] } });
    if (activeMeeting && activeMeeting._id.toString() !== meeting._id.toString()) {
      return res.status(409).json({ success: false, message: 'Another meeting is already live for this project' });
    }

    const videoSdkRoomId = await createVideoSdkRoom();
    meeting.videoSdkRoomId = videoSdkRoomId;
    meeting.status = 'live';
    meeting.startedAt = new Date();
    meeting.participants = [{ userId: req.user.id, joinedAt: new Date() }];
    await meeting.save();

    await ActivityLog.create({ projectId: project._id, userId: req.user.id, message: 'started scheduled meeting "' + (meeting.title || 'Project meeting') + '".' });
    await Message.updateMany(
      { 'metadata.type': 'meeting', 'metadata.meetingId': meeting._id.toString() },
      { $set: { 'metadata.status': 'live', 'metadata.title': meeting.title || 'Project meeting', 'metadata.projectName': project.name, 'metadata.link': `/projects/${project._id}/meeting` } }
    );
    await addProjectChatMessage(req, project, `${String.fromCodePoint(0x1F3A5)} Meeting started: ${meeting.title || 'Project meeting'}`, {
      type: 'meeting',
      meetingId: meeting._id.toString(),
      projectId: project._id.toString(),
      title: meeting.title || 'Project meeting',
      projectName: project.name,
      status: 'live',
      link: `/projects/${project._id}/meeting`,
    });

    const participantIds = meeting.scheduledParticipants?.length ? meeting.scheduledParticipants.map(id => id.toString()) : getProjectParticipantIds(project);
    const notifications = await Notification.insertMany(participantIds
      .filter(userId => userId !== req.user.id)
      .map(userId => ({
        userId,
        type: 'meeting_started',
        message: `${project.name}: ${meeting.title || 'scheduled meeting'} has started.`,
        metadata: { projectId: project._id.toString(), meetingId: meeting._id.toString(), link: `/projects/${project._id}/meeting` },
      })));

    const populatedMeeting = await populateMeeting(Meeting.findById(meeting._id));
    const io = req.app.get('io');
    if (io) notifications.forEach(notification => io.to(notification.userId.toString()).emit('notification_received', notification));
    emitMeetingUpdate(req, project, 'meeting_started', populatedMeeting);
    res.json({ success: true, data: toCalendarMeeting(populatedMeeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.scheduleProjectMeeting = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!canManageMeeting(project, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can schedule meetings' });
    }

    const { title, description, date, startTime, endTime, participants = [], meetingType = 'video', recurrence = 'none' } = req.body;
    const startsAt = parseScheduledDateTime(date, startTime);
    const endsAt = parseScheduledDateTime(date, endTime);
    if (!title?.trim() || !startsAt || !endsAt || endsAt <= startsAt) {
      return res.status(400).json({ success: false, message: 'A title, date, valid start time, and valid end time are required' });
    }

    const scheduledParticipants = getScopedParticipantIds(project, participants);
    const meetingId = 'scheduled-' + crypto.randomUUID();
    let meeting = await Meeting.create({
      projectId: project._id,
      meetingId,
      videoSdkRoomId: '',
      provider: 'scheduled',
      title: title.trim(),
      description: description || '',
      scheduledDate: date,
      startTime,
      endTime,
      startsAt,
      endsAt,
      meetingType,
      recurrence,
      hostId: req.user.id,
      status: 'scheduled',
      scheduledParticipants,
      participants: [],
    });

    await ActivityLog.create({
      projectId: project._id,
      userId: req.user.id,
      message: 'scheduled meeting "' + meeting.title + '".',
    });

    meeting = await populateMeeting(Meeting.findById(meeting._id));
    const link = '/projects/' + project._id;
    await addProjectChatMessage(req, project, 'Meeting scheduled: ' + meeting.title + ' on ' + date + ' from ' + startTime + ' to ' + endTime, {
      type: 'meeting',
      meetingId: meeting._id.toString(),
      projectId: project._id.toString(),
      title: meeting.title,
      projectName: project.name,
      status: 'scheduled',
      link,
    });

    const notifications = await Notification.insertMany(scheduledParticipants
      .filter(userId => userId !== req.user.id)
      .map(userId => ({
        userId,
        type: 'meeting_scheduled',
        message: project.name + ': meeting scheduled - ' + meeting.title,
        metadata: {
          projectId: project._id.toString(),
          meetingId: meeting._id.toString(),
          link,
        },
      })));

    const io = req.app.get('io');
    if (io) {
      notifications.forEach(notification => {
        io.to(notification.userId.toString()).emit('notification_received', notification);
      });
    }
    emitMeetingUpdate(req, project, 'meeting_scheduled', meeting);

    res.status(201).json({ success: true, data: toCalendarMeeting(meeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateScheduledMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting || meeting.status === 'cancelled' || ['live', 'active', 'completed', 'ended'].includes(meeting.status)) {
      return res.status(404).json({ success: false, message: 'Scheduled meeting not found' });
    }

    const project = await Project.findById(meeting.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (!canManageMeeting(project, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can edit meetings' });
    }

    const { title, description, date, startTime, endTime, participants, meetingType, recurrence } = req.body;
    const nextDate = date || meeting.scheduledDate;
    const nextStartTime = startTime || meeting.startTime;
    const nextEndTime = endTime || meeting.endTime;
    const startsAt = parseScheduledDateTime(nextDate, nextStartTime);
    const endsAt = parseScheduledDateTime(nextDate, nextEndTime);
    if (!startsAt || !endsAt || endsAt <= startsAt) {
      return res.status(400).json({ success: false, message: 'A valid start and end time are required' });
    }

    meeting.title = title?.trim() || meeting.title;
    meeting.description = description ?? meeting.description;
    meeting.scheduledDate = nextDate;
    meeting.startTime = nextStartTime;
    meeting.endTime = nextEndTime;
    meeting.startsAt = startsAt;
    meeting.endsAt = endsAt;
    meeting.meetingType = meetingType || meeting.meetingType;
    meeting.recurrence = recurrence || meeting.recurrence;
    if (Array.isArray(participants)) meeting.scheduledParticipants = getScopedParticipantIds(project, participants);
    await meeting.save();

    await ActivityLog.create({ projectId: project._id, userId: req.user.id, message: 'rescheduled meeting "' + meeting.title + '".' });
    await addProjectChatMessage(req, project, 'Meeting updated: ' + meeting.title + ' on ' + meeting.scheduledDate + ' from ' + meeting.startTime + ' to ' + meeting.endTime, { type: 'meeting', meetingId: meeting._id.toString(), projectId: project._id.toString(), title: meeting.title, projectName: project.name, status: 'scheduled', link: '/projects/' + project._id });

    const populatedMeeting = await populateMeeting(Meeting.findById(meeting._id));
    emitMeetingUpdate(req, project, 'meeting_updated', populatedMeeting);
    res.json({ success: true, data: toCalendarMeeting(populatedMeeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const project = await Project.findById(meeting.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (!canManageMeeting(project, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can cancel meetings' });
    }

    meeting.status = 'cancelled';
    meeting.endedAt = new Date();
    await meeting.save();

    await ActivityLog.create({ projectId: project._id, userId: req.user.id, message: 'cancelled meeting "' + (meeting.title || 'Project meeting') + '".' });
    await addProjectChatMessage(req, project, 'Meeting cancelled: ' + (meeting.title || 'Project meeting'), { type: 'meeting', meetingId: meeting._id.toString(), projectId: project._id.toString(), title: meeting.title || 'Project meeting', projectName: project.name, status: 'cancelled', link: '/projects/' + project._id });

    const participantIds = meeting.scheduledParticipants?.length ? meeting.scheduledParticipants.map(id => id.toString()) : getProjectParticipantIds(project);
    const notifications = await Notification.insertMany(participantIds
      .filter(userId => userId !== req.user.id)
      .map(userId => ({ userId, type: 'meeting_cancelled', message: project.name + ': meeting cancelled - ' + (meeting.title || 'Project meeting'), metadata: { projectId: project._id.toString(), meetingId: meeting._id.toString(), title: meeting.title || 'Project meeting', projectName: project.name, link: '/projects/' + project._id } })));

    const populatedMeeting = await populateMeeting(Meeting.findById(meeting._id));
    const io = req.app.get('io');
    if (io) notifications.forEach(notification => io.to(notification.userId.toString()).emit('notification_received', notification));
    emitMeetingUpdate(req, project, 'meeting_cancelled', populatedMeeting);
    res.json({ success: true, data: toCalendarMeeting(populatedMeeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.joinMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting || !['live', 'active'].includes(meeting.status)) {
      return res.status(404).json({ success: false, message: meeting?.provider === 'scheduled' ? 'Meeting has not started yet' : 'Active meeting not found' });
    }

    const project = await Project.findById(meeting.projectId);
    if (!project || !isProjectMember(project, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const existingParticipant = meeting.participants.find(participant => participant.userId.toString() === req.user.id);
    if (existingParticipant) {
      existingParticipant.leftAt = null;
    } else {
      meeting.participants.push({ userId: req.user.id, joinedAt: new Date() });
    }
    await meeting.save();

    const populatedMeeting = await populateMeeting(Meeting.findById(meeting._id));
    emitMeetingUpdate(req, project, 'meeting_updated', populatedMeeting);
    emitMeetingUpdate(req, project, 'meeting_participant_joined', populatedMeeting, { actor: { id: req.user.id, name: req.user.name, avatar: req.user.avatar } });

    res.json({ success: true, data: toCalendarMeeting(populatedMeeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.leaveMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting || !['live', 'active'].includes(meeting.status)) {
      return res.status(404).json({ success: false, message: meeting?.provider === 'scheduled' ? 'Meeting has not started yet' : 'Active meeting not found' });
    }

    const project = await Project.findById(meeting.projectId);
    if (!project || !isProjectMember(project, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const participant = meeting.participants.find(item => item.userId.toString() === req.user.id);
    if (participant) {
      participant.leftAt = new Date();
      await meeting.save();
    }

    const populatedMeeting = await populateMeeting(Meeting.findById(meeting._id));
    emitMeetingUpdate(req, project, 'meeting_updated', populatedMeeting);
    emitMeetingUpdate(req, project, 'meeting_participant_left', populatedMeeting, { actor: { id: req.user.id, name: req.user.name, avatar: req.user.avatar } });

    res.json({ success: true, data: toCalendarMeeting(populatedMeeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting || !['live', 'active'].includes(meeting.status)) {
      return res.status(404).json({ success: false, message: meeting?.provider === 'scheduled' ? 'Meeting has not started yet' : 'Active meeting not found' });
    }

    const project = await Project.findById(meeting.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (meeting.hostId.toString() !== req.user.id && !canManageMeeting(project, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only the meeting host can end this meeting' });
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    meeting.duration = Math.max(0, Math.round((meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 1000));
    meeting.participants = meeting.participants.map(participant => ({
      userId: participant.userId,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt || meeting.endedAt,
    }));
    await meeting.save();

    await ActivityLog.create({
      projectId: project._id,
      userId: req.user.id,
      message: `ended a meeting.`,
    });
    await Message.updateMany(
      { 'metadata.type': 'meeting', 'metadata.meetingId': meeting._id.toString() },
      { $set: { 'metadata.status': 'ended', 'metadata.title': meeting.title || 'Project meeting', 'metadata.projectName': project.name, 'metadata.link': `/projects/${project._id}` } }
    );

    await addProjectChatMessage(req, project, `${String.fromCodePoint(0x1F6D1)} Meeting ended by ${req.user.name}\nDuration: ${formatDuration(meeting.duration)}`, {
      type: 'meeting',
      meetingId: meeting._id.toString(),
      projectId: project._id.toString(),
      status: 'ended',
      link: `/projects/${project._id}`,
    });

    const notifications = await Notification.insertMany(getProjectParticipantIds(project)
      .filter(userId => userId !== req.user.id)
      .map(userId => ({
        userId,
        type: 'meeting_ended',
        message: `Meeting ended by ${req.user.name}.`,
        metadata: {
          projectId: project._id.toString(),
          meetingId: meeting._id.toString(),
          title: meeting.title || 'Project meeting',
          projectName: project.name,
          link: `/projects/${project._id}`,
        },
      })));

    const populatedMeeting = await populateMeeting(Meeting.findById(meeting._id));
    const io = req.app.get('io');
    if (io) {
      notifications.forEach(notification => {
        io.to(notification.userId.toString()).emit('notification_received', notification);
      });
    }
    emitMeetingUpdate(req, project, 'meeting_ended', populatedMeeting, { endedBy: { id: req.user.id, name: req.user.name, avatar: req.user.avatar } });

    res.json({ success: true, data: toCalendarMeeting(populatedMeeting) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
















