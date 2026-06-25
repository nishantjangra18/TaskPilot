const Invitation = require('../models/Invitation');
const Notification = require('../models/Notification');
const Project = require('../models/Project');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Message = require('../models/Message');
const { syncProjectConversation } = require('./chatController');

// @desc    Send a project invitation
// @route   POST /api/invitations
// @access  Private
exports.sendInvitation = async (req, res) => {
  try {
    const { projectId, receiverId } = req.body;

    if (!projectId || !receiverId) {
      return res.status(400).json({ success: false, message: 'Project ID and Receiver ID are required' });
    }

    // 1. Fetch Project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // 2. Verify sender is owner
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only project owners can invite members' });
    }

    // 3. Fetch Receiver User
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Invited user not found' });
    }

    // 4. Check if receiver is already owner or member
    const isOwner = project.owner.toString() === receiverId;
    const isMember = project.members.some(m => m.toString() === receiverId);
    if (isOwner || isMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this project' });
    }

    // 5. Check if there's a pending invitation already
    const existingInvitation = await Invitation.findOne({
      projectId,
      receiverId,
      status: 'pending'
    });
    if (existingInvitation) {
      return res.status(400).json({ success: false, message: 'An invitation is already pending for this user' });
    }

    // 6. Create Invitation
    const invitation = await Invitation.create({
      projectId,
      projectName: project.name,
      senderId: req.user.id,
      senderName: req.user.name,
      receiverId,
      receiverName: receiver.name,
      status: 'pending'
    });

    // 7. Create Notification for receiver
    const notification = await Notification.create({
      userId: receiverId,
      type: 'invitation_received',
      message: `You have been invited to join ${project.name}`
    });

    // 8. Real-time updates via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(receiverId.toString()).emit('invitation_received', invitation);
      io.to(receiverId.toString()).emit('notification_received', notification);
    }

    res.status(201).json({ success: true, data: invitation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all pending invitations for logged-in user
// @route   GET /api/invitations/pending
// @access  Private
exports.getPendingInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({
      receiverId: req.user.id,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: invitations.length, data: invitations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept a project invitation
// @route   PUT /api/invitations/:id/accept
// @access  Private
exports.acceptInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    // Verify user is receiver
    if (invitation.receiverId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only accept your own invitations' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Invitation has already been ${invitation.status}` });
    }

    // 1. Update project members list
    const project = await Project.findById(invitation.projectId);
    if (!project) {
      // If project is deleted, mark invitation as rejected/invalid
      invitation.status = 'rejected';
      invitation.respondedAt = Date.now();
      await invitation.save();
      return res.status(404).json({ success: false, message: 'Project workspace no longer exists' });
    }

    // Add user to members if not already there
    if (!project.members.some(member => member.toString() === req.user.id)) {
      project.members.push(req.user.id);
      await project.save();
    }

    const projectConversation = await syncProjectConversation(project);

    // 2. Update Invitation status
    invitation.status = 'accepted';
    invitation.respondedAt = Date.now();
    await invitation.save();

    const joinMessage = await Message.create({
      conversationId: projectConversation._id,
      senderId: req.user.id,
      text: `${req.user.name} joined the project.`,
      metadata: { type: 'system', event: 'member_joined' },
      readBy: [req.user.id],
    });
    projectConversation.lastMessage = {
      text: joinMessage.text,
      senderId: req.user.id,
      createdAt: joinMessage.createdAt,
    };
    await projectConversation.save();
    // 3. Log Activity
    await ActivityLog.create({
      projectId: project._id,
      userId: req.user.id,
      message: `joined project "${project.name}" via invitation.`
    });

    // 4. Create Notification for project owner (sender)
    const notification = await Notification.create({
      userId: invitation.senderId,
      type: 'invitation_accepted',
      message: `${req.user.name} accepted your invitation to join ${project.name}.`
    });

    // 5. Emit real-time updates via Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Notify sender
      io.to(invitation.senderId.toString()).emit('notification_received', notification);
      io.to(req.user.id).emit('invitation_updated', invitation);
      
      // Notify all members and owner of the project to update their member list
      const allMembers = [project.owner.toString(), ...project.members.map(m => m.toString())];
      allMembers.forEach(memberId => {
        io.to(memberId).emit('member_list_updated', { projectId: project._id });
        io.to(memberId).emit('chat_updated', projectConversation);
      });
    }

    res.json({ success: true, data: invitation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject a project invitation
// @route   PUT /api/invitations/:id/reject
// @access  Private
exports.rejectInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    // Verify user is receiver
    if (invitation.receiverId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only reject your own invitations' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Invitation has already been ${invitation.status}` });
    }

    // 1. Update status
    invitation.status = 'rejected';
    invitation.respondedAt = Date.now();
    await invitation.save();

    // 2. Create Notification for project owner
    const notification = await Notification.create({
      userId: invitation.senderId,
      type: 'invitation_rejected',
      message: `${req.user.name} declined your invitation to join ${invitation.projectName}.`
    });

    // 3. Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(invitation.senderId.toString()).emit('notification_received', notification);
      io.to(req.user.id).emit('invitation_updated', invitation);
    }

    res.json({ success: true, data: invitation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
