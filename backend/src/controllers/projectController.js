const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { syncProjectConversation } = require('./chatController');
const { areAcceptedConnections } = require('../utils/networkAccess');

const validateConnectedMembers = async (ownerId, memberIds = []) => {
  const uniqueMemberIds = [...new Set(memberIds.map(memberId => memberId.toString()))];
  const externalMemberIds = uniqueMemberIds.filter(memberId => memberId !== ownerId.toString());

  for (const memberId of externalMemberIds) {
    const isConnected = await areAcceptedConnections(ownerId, memberId);
    if (!isConnected) {
      return { allowed: false, memberId };
    }
  }

  return { allowed: true, memberIds: uniqueMemberIds };
};
exports.createProject = async (req, res) => {
  try {
    const { name, description, theme, visibility, members, icon, priority, deadline } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    const projectMembers = members && Array.isArray(members) ? members.map(m => m.toString()) : [];
    
    // Add owner to members list if not already there
    if (!projectMembers.includes(req.user.id.toString())) {
      projectMembers.push(req.user.id.toString());
    }

    const memberValidation = await validateConnectedMembers(req.user.id, projectMembers);
    if (!memberValidation.allowed) {
      return res.status(403).json({ success: false, message: 'Project members must be accepted connections' });
    }

    const uniqueMembers = memberValidation.memberIds;

    const project = await Project.create({
      name,
      description,
      theme: theme || '#3b82f6',
      visibility,
      owner: req.user.id,
      members: uniqueMembers,
      icon: icon || 'folder',
      priority: priority || 'medium',
      deadline: deadline || null,
    });

    await ActivityLog.create({
      projectId: project._id,
      userId: req.user.id,
      message: `created project "${project.name}".`
    });

    await syncProjectConversation(project);

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    // Return projects where user is owner or a member
    const projects = await Project.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    }).populate('owner', 'name email avatar title').populate('members', 'name email avatar title');

    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar title')
      .populate('members', 'name email avatar title');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check visibility / access permission
    const isOwner = project.owner._id.toString() === req.user.id;
    const isMember = project.members.some(m => m._id.toString() === req.user.id);

    if (!isOwner && !isMember && project.visibility === 'private') {
      return res.status(403).json({ success: false, message: 'Access denied to this workspace' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Verify user is owner
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this workspace' });
    }

    if (req.body.members && Array.isArray(req.body.members)) {
      const memberValidation = await validateConnectedMembers(req.user.id, req.body.members);
      if (!memberValidation.allowed) {
        return res.status(403).json({ success: false, message: 'Project members must be accepted connections' });
      }
      req.body.members = memberValidation.memberIds;
    }

    project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('owner', 'name email avatar title').populate('members', 'name email avatar title');

    // Log update
    await ActivityLog.create({
      projectId: project._id,
      userId: req.user.id,
      message: `updated project settings.`
    });

    await syncProjectConversation(project);

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Verify user is owner
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this workspace' });
    }

    // Cascading delete: delete all tasks associated with this project
    await Task.deleteMany({ projectId: project._id });

    // Delete all activity logs associated with this project
    await ActivityLog.deleteMany({ projectId: project._id });

    const projectConversations = await Conversation.find({ projectId: project._id }).select('_id');
    const conversationIds = projectConversations.map(conversation => conversation._id);
    if (conversationIds.length > 0) {
      await Message.deleteMany({ conversationId: { $in: conversationIds } });
      await Conversation.deleteMany({ _id: { $in: conversationIds } });
    }

    await project.deleteOne();

    res.json({ success: true, data: {}, message: 'Project and all associated tasks successfully deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    }).select('_id');

    const projectIds = projects.map(p => p._id);

    const logs = await ActivityLog.find({ projectId: { $in: projectIds } })
      .populate('userId', 'name email avatar title')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
