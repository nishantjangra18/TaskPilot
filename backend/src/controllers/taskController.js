const Task = require('../models/Task');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const { createAndEmitNotification, findMentionedUsers, normalizeId, uniqueIds } = require('../utils/realtimeNotifications');

const statusLabels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

const getProjectUserIds = (project) => uniqueIds([
  project.owner,
  ...(project.members || []),
]);

const notifyTaskEvent = async (req, userId, type, message, task, project) => {
  await createAndEmitNotification(req, {
    userId,
    type,
    message,
    metadata: {
      projectId: normalizeId(project._id),
      projectName: project.name,
      taskId: normalizeId(task._id),
      taskTitle: task.title,
      link: `/projects/${normalizeId(project._id)}/tasks/${normalizeId(task._id)}`,
    },
    realtimeEvent: 'task_notification',
  });
};

// Helper to check user permission to access a project
const checkProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { allowed: false, status: 404, message: 'Project not found' };

  const isOwner = project.owner.toString() === userId;
  const isMember = project.members.some(m => m.toString() === userId);

  if (!isOwner && !isMember && project.visibility === 'private') {
    return { allowed: false, status: 403, message: 'Access denied to this project' };
  }
  return { allowed: true, project };
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    const { projectId, title, description, taskType, priority, status, assignee, dueDate, dueTime, attachments } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ success: false, message: 'Project ID and title are required' });
    }

    const access = await checkProjectAccess(projectId, req.user.id);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const task = await Task.create({
      projectId,
      title,
      description,
      taskType,
      priority,
      status,
      assignee: assignee || null,
      dueDate,
      dueTime,
      attachments: attachments || [],
      comments: [],
    });

    await ActivityLog.create({
      projectId,
      userId: req.user.id,
      message: `created task "${title}".`
    });

    if (assignee) {
      await notifyTaskEvent(req, assignee, 'task_assigned', `You were assigned to "${task.title}".`, task, access.project);
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tasks - if projectId is specified, get tasks for that project; otherwise get all tasks for user's projects
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    const { projectId } = req.query;

    if (projectId) {
      const access = await checkProjectAccess(projectId, req.user.id);
      if (!access.allowed) {
        return res.status(access.status).json({ success: false, message: access.message });
      }

      const tasks = await Task.find({ projectId })
        .populate('assignee', 'name email avatar title')
        .populate('comments.userId', 'name email avatar title');

      return res.json({ success: true, count: tasks.length, data: tasks });
    }

    const projects = await Project.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    }).select('_id');

    const projectIds = projects.map(p => p._id);

    const tasks = await Task.find({ projectId: { $in: projectIds } })
      .populate('assignee', 'name email avatar title')
      .populate('comments.userId', 'name email avatar title');

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single task details
// @route   GET /api/tasks/:id
// @access  Private
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar title')
      .populate('comments.userId', 'name email avatar title');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId, req.user.id);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId, req.user.id);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const previousStatus = task.status;
    const previousAssigneeId = normalizeId(task.assignee);

    let logMsg = `updated task "${task.title}".`;
    if (req.body.status && req.body.status !== task.status) {
      logMsg = `updated status of "${task.title}" to ${statusLabels[req.body.status] || req.body.status}.`;
    } else if (req.body.title && req.body.title !== task.title) {
      logMsg = `renamed task "${task.title}" to "${req.body.title}".`;
    }

    if (req.body.comments && Array.isArray(req.body.comments)) {
      req.body.comments = req.body.comments.map(c => {
        if (c.userId && typeof c.userId === 'object') {
          return {
            ...c,
            userId: c.userId._id || c.userId.id || c.userId
          };
        }
        return c;
      });
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('assignee', 'name email avatar title')
      .populate('comments.userId', 'name email avatar title');

    await ActivityLog.create({
      projectId: task.projectId,
      userId: req.user.id,
      message: logMsg
    });

    const nextAssigneeId = normalizeId(task.assignee);
    if (req.body.assignee !== undefined && nextAssigneeId && nextAssigneeId !== previousAssigneeId) {
      await notifyTaskEvent(req, nextAssigneeId, 'task_assigned', `You were assigned to "${task.title}".`, task, access.project);
    }

    if (req.body.status && req.body.status !== previousStatus) {
      const recipients = uniqueIds([nextAssigneeId, access.project.owner]).filter(userId => userId !== req.user.id);
      await Promise.all(recipients.map(userId => notifyTaskEvent(
        req,
        userId,
        'task_status_changed',
        `"${task.title}" moved to ${statusLabels[task.status] || task.status}.`,
        task,
        access.project
      )));
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId, req.user.id);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const isOwner = access.project.owner.toString() === req.user.id;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only the project owner can delete tasks' });
    }

    await ActivityLog.create({
      projectId: task.projectId,
      userId: req.user.id,
      message: `deleted task "${task.title}".`
    });

    await task.deleteOne();

    res.json({ success: true, data: {}, message: 'Task successfully deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a comment to a task
// @route   POST /api/tasks/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const access = await checkProjectAccess(task.projectId, req.user.id);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const commentId = 'c_' + Date.now() + Math.random().toString(36).substring(2, 5);

    const newComment = {
      id: commentId,
      text: text.trim(),
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatar || null,
      createdAt: new Date()
    };

    task.comments.push(newComment);
    await task.save();

    const updatedTask = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar title')
      .populate('comments.userId', 'name email avatar title');

    const mentionedUsers = await findMentionedUsers(text, getProjectUserIds(access.project).filter(userId => userId !== req.user.id));
    await Promise.all(mentionedUsers.map(user => notifyTaskEvent(
      req,
      normalizeId(user),
      'user_mentioned',
      `${req.user.name} mentioned you on "${task.title}".`,
      updatedTask,
      access.project
    )));

    res.status(201).json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
