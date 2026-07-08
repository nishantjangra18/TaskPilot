const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const {
  callDeepSeekChat,
  callDeepSeekPlanning,
  callDeepSeekActionSuggestions,
  callDeepSeekProjectCreator,
  createDeepSeekStream,
  DeepSeekError,
} = require('../services/deepseekService');
const { createAndEmitNotification, normalizeId, uniqueIds } = require('../utils/realtimeNotifications');

const PLANNING_INTENT_PATTERN = /\b(create\s+(?:a\s+)?task\s+plan|break\s+(?:this|it|the)?\s*feature\s+into\s+tasks|plan\s+(?:this\s+)?project|generate\s+(?:a\s+)?sprint|generate\s+milestones?|estimate\s+workload|execution\s+plan|task\s+breakdown|sprint\s+plan|milestone\s+plan)\b/i;
const ACTION_INTENT_PATTERN = /\b(reassign|assign\s+.*to|change\s+priority|update\s+due\s+date|move\s+.*status|mark\s+.*complete|complete\s+.*task|what\s+actions|suggest\s+actions|actionable|apply|fix\s+workload|reduce\s+risk|balance\s+workload|who\s+should|prioriti[sz]e\s+next)\b/i;

const allowedActionTypes = ['reassign_task', 'update_due_date', 'change_priority', 'mark_complete'];
const allowedPriorities = ['low', 'medium', 'high', 'critical'];

const getUserId = (req) => req.user.id.toString();
const sanitizeDeepSeekUserId = (userId) => `taskpilot-${userId}`.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 512);
const getObjectId = (value) => value?._id?.toString() || value?.toString();
const isPlanningRequest = (message) => PLANNING_INTENT_PATTERN.test(message || '');
const isActionSuggestionRequest = (message) => ACTION_INTENT_PATTERN.test(message || '');

const isProjectMember = (project, userId) => {
  const ownerId = getObjectId(project.owner);
  const memberIds = (project.members || []).map(member => getObjectId(member));
  return ownerId === userId || memberIds.includes(userId);
};

const getProjectParticipantIds = (project) => uniqueIds([project.owner, ...(project.members || [])]);

const validateProjectAccess = async (projectId, userId) => {
  if (!projectId) return null;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return { error: { status: 400, message: 'A valid projectId is required' } };
  }

  const project = await Project.findById(projectId)
    .populate('owner', 'name email avatar title')
    .populate('members', 'name email avatar title');

  if (!project) {
    return { error: { status: 404, message: 'Project not found' } };
  }

  if (!isProjectMember(project, userId)) {
    return { error: { status: 403, message: 'You do not have access to this project' } };
  }

  return { project };
};

const validateTaskProjectAccess = async (taskId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return { error: { status: 400, message: 'A valid taskId is required' } };
  }

  const task = await Task.findById(taskId).populate('assignee', 'name email avatar title');
  if (!task) {
    return { error: { status: 404, message: 'Task not found' } };
  }

  const project = await Project.findById(task.projectId)
    .populate('owner', 'name email avatar title')
    .populate('members', 'name email avatar title');
  if (!project) {
    return { error: { status: 404, message: 'Project not found' } };
  }

  if (!isProjectMember(project, userId)) {
    return { error: { status: 403, message: 'You do not have access to this project' } };
  }

  return { task, project };
};

const parseDueAt = (task) => {
  if (!task.dueDate) return null;
  const dueTime = task.dueTime || '23:59';
  const dueAt = new Date(`${task.dueDate}T${dueTime}:00`);
  return Number.isNaN(dueAt.getTime()) ? null : dueAt;
};

const isOverdue = (task, now = new Date()) => {
  if (task.status === 'done') return false;
  const dueAt = parseDueAt(task);
  return Boolean(dueAt && dueAt < now);
};

const getMemberSummary = (project) => {
  const membersById = new Map();
  const addMember = (member, role) => {
    const id = getObjectId(member);
    if (!id) return;
    const existing = membersById.get(id);
    membersById.set(id, {
      id,
      name: member?.name || 'Unknown user',
      email: member?.email || '',
      role: existing?.role === 'Owner' ? 'Owner' : role,
      title: member?.title || '',
    });
  };

  addMember(project.owner, 'Owner');
  (project.members || []).forEach(member => addMember(member, getObjectId(member) === getObjectId(project.owner) ? 'Owner' : 'Member'));
  return [...membersById.values()];
};

const buildProjectContext = async (project) => {
  const now = new Date();
  const tasks = await Task.find({ projectId: project._id })
    .populate('assignee', 'name email avatar title')
    .sort({ status: 1, priority: 1, dueDate: 1 })
    .limit(80);

  const statusCounts = tasks.reduce((counts, task) => ({
    ...counts,
    [task.status || 'todo']: (counts[task.status || 'todo'] || 0) + 1,
  }), { todo: 0, in_progress: 0, review: 0, done: 0 });

  const priorityCounts = tasks.reduce((counts, task) => ({
    ...counts,
    [task.priority || 'medium']: (counts[task.priority || 'medium'] || 0) + 1,
  }), { low: 0, medium: 0, high: 0, critical: 0 });

  const memberWorkload = new Map();
  for (const task of tasks) {
    const assigneeId = getObjectId(task.assignee) || 'unassigned';
    const current = memberWorkload.get(assigneeId) || {
      assigneeId,
      assigneeName: task.assignee?.name || 'Unassigned',
      total: 0,
      open: 0,
      overdue: 0,
      done: 0,
    };
    current.total += 1;
    if (task.status === 'done') current.done += 1;
    else current.open += 1;
    if (isOverdue(task, now)) current.overdue += 1;
    memberWorkload.set(assigneeId, current);
  }

  const totalTasks = tasks.length;
  const completedTasks = statusCounts.done || 0;
  const overdueTasks = tasks.filter(task => isOverdue(task, now));

  return {
    project: {
      id: project._id.toString(),
      name: project.name,
      description: project.description || '',
      priority: project.priority || 'medium',
      deadline: project.deadline || null,
      visibility: project.visibility || 'private',
      createdAt: project.createdAt,
    },
    teamMembers: getMemberSummary(project),
    progress: {
      totalTasks,
      completedTasks,
      openTasks: totalTasks - completedTasks,
      completionPercent: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
      statusCounts,
      priorityCounts,
      overdueTaskCount: overdueTasks.length,
    },
    workload: [...memberWorkload.values()].sort((a, b) => b.open - a.open || b.total - a.total),
    overdueTasks: overdueTasks.map(task => ({
      id: task._id.toString(),
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee?.name || 'Unassigned',
      dueDate: task.dueDate || null,
      dueTime: task.dueTime || null,
    })),
    tasks: tasks.map(task => ({
      id: task._id.toString(),
      title: task.title,
      description: task.description || '',
      type: task.taskType || 'feature',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      assignee: task.assignee ? {
        id: getObjectId(task.assignee),
        name: task.assignee.name,
        email: task.assignee.email,
        role: task.assignee.title || '',
      } : null,
      dueDate: task.dueDate || null,
      dueTime: task.dueTime || null,
      overdue: isOverdue(task, now),
      createdAt: task.createdAt,
    })),
  };
};

const getTaskFromContext = (context, taskId) => context?.tasks?.find(task => task.id === taskId);
const getMemberFromContext = (context, memberId) => context?.teamMembers?.find(member => member.id === memberId);

const createActionPreview = (action, context) => {
  const task = getTaskFromContext(context, action.taskId);
  if (!task || action.projectId !== context?.project?.id) return null;

  const current = {
    taskTitle: task.title,
    assignee: task.assignee?.name || 'Unassigned',
    dueDate: task.dueDate || 'No due date',
    priority: task.priority || 'medium',
    status: task.status || 'todo',
  };

  if (action.type === 'reassign_task') {
    const member = getMemberFromContext(context, action.newAssigneeId);
    if (!member) return null;
    return { current, next: { assignee: member.name }, fields: ['assignee'] };
  }

  if (action.type === 'update_due_date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(action.newDueDate || '')) return null;
    return { current, next: { dueDate: action.newDueDate }, fields: ['dueDate'] };
  }

  if (action.type === 'change_priority') {
    if (!allowedPriorities.includes(action.newPriority)) return null;
    return { current, next: { priority: action.newPriority }, fields: ['priority'] };
  }

  if (action.type === 'mark_complete') {
    return { current, next: { status: 'done' }, fields: ['status'] };
  }

  return null;
};

const filterSafeActions = (actions = [], context) => actions
  .filter(action => allowedActionTypes.includes(action?.type))
  .map(action => ({ ...action, projectId: action.projectId || context?.project?.id }))
  .map(action => ({ ...action, preview: createActionPreview(action, context) }))
  .filter(action => action.preview);

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

const populateTask = (taskId) => Task.findById(taskId)
  .populate('assignee', 'name email avatar title')
  .populate('comments.userId', 'name email avatar title');

const sendStreamError = (res, error) => {
  res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'AI request failed' })}\n\n`);
  res.end();
};

const proxyDeepSeekStream = async (deepSeekStream, res) => {
  const reader = deepSeekStream.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }

  res.end();
};

exports.chatWithAI = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { message, projectId, conversationHistory, stream } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const access = await validateProjectAccess(projectId, userId);
    if (access?.error) {
      return res.status(access.error.status).json({ success: false, message: access.error.message });
    }

    const projectContext = access?.project ? await buildProjectContext(access.project) : null;

    if (isPlanningRequest(message)) {
      const aiPlan = await callDeepSeekPlanning({
        message,
        conversationHistory,
        projectContext,
        userId: sanitizeDeepSeekUserId(userId),
      });

      return res.json({
        success: true,
        response: aiPlan.response,
        plan: aiPlan.plan,
      });
    }

    if (projectContext && isActionSuggestionRequest(message)) {
      const aiActions = await callDeepSeekActionSuggestions({
        message,
        conversationHistory,
        projectContext,
        userId: sanitizeDeepSeekUserId(userId),
      });

      return res.json({
        success: true,
        response: aiActions.response,
        actions: filterSafeActions(aiActions.actions, projectContext),
      });
    }

    if (stream) {
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.flushHeaders?.();

      try {
        const deepSeekStream = await createDeepSeekStream({
          message,
          conversationHistory,
          projectContext,
          userId: sanitizeDeepSeekUserId(userId),
        });

        await proxyDeepSeekStream(deepSeekStream, res);
      } catch (error) {
        sendStreamError(res, error);
      }
      return;
    }

    const aiResponse = await callDeepSeekChat({
      message,
      conversationHistory,
      projectContext,
      userId: sanitizeDeepSeekUserId(userId),
    });

    res.json({ success: true, response: aiResponse.response });
  } catch (error) {
    if (error instanceof DeepSeekError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }

    res.status(500).json({ success: false, message: 'AI assistant request failed' });
  }
};

exports.applyAIAction = async (req, res) => {
  try {
    const { action } = req.body;
    const userId = getUserId(req);

    if (!action || !allowedActionTypes.includes(action.type)) {
      return res.status(400).json({ success: false, message: 'Unsupported AI action type' });
    }

    const access = await validateTaskProjectAccess(action.taskId, userId);
    if (access?.error) {
      return res.status(access.error.status).json({ success: false, message: access.error.message });
    }

    const { task, project } = access;
    const taskProjectId = normalizeId(task.projectId);
    if (action.projectId && action.projectId !== taskProjectId) {
      return res.status(400).json({ success: false, message: 'Action project does not match the task project' });
    }
    const previousAssigneeId = normalizeId(task.assignee);
    let logMessage = `applied AI suggestion to task "${task.title}".`;
    let notificationMessage = null;
    let notificationType = 'task_status_changed';
    const update = {};

    if (action.type === 'reassign_task') {
      if (!mongoose.Types.ObjectId.isValid(action.newAssigneeId)) {
        return res.status(400).json({ success: false, message: 'A valid newAssigneeId is required' });
      }

      if (!getProjectParticipantIds(project).includes(action.newAssigneeId)) {
        return res.status(400).json({ success: false, message: 'New assignee must be a project member' });
      }

      const assignee = await User.findById(action.newAssigneeId).select('name email avatar title');
      if (!assignee) {
        return res.status(404).json({ success: false, message: 'New assignee not found' });
      }

      update.assignee = assignee._id;
      notificationType = 'task_assigned';
      notificationMessage = `You were assigned to "${task.title}" by an AI-approved action.`;
      logMessage = `reassigned task "${task.title}" to ${assignee.name} from an AI suggestion.`;
    }

    if (action.type === 'update_due_date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(action.newDueDate || '')) {
        return res.status(400).json({ success: false, message: 'A valid newDueDate in YYYY-MM-DD format is required' });
      }
      update.dueDate = action.newDueDate;
      notificationMessage = `Due date for "${task.title}" changed to ${action.newDueDate}.`;
      logMessage = `updated due date of "${task.title}" to ${action.newDueDate} from an AI suggestion.`;
    }

    if (action.type === 'change_priority') {
      const newPriority = String(action.newPriority || '').toLowerCase();
      if (!allowedPriorities.includes(newPriority)) {
        return res.status(400).json({ success: false, message: 'A valid newPriority is required' });
      }
      update.priority = newPriority;
      notificationMessage = `Priority for "${task.title}" changed to ${newPriority}.`;
      logMessage = `changed priority of "${task.title}" to ${newPriority} from an AI suggestion.`;
    }

    if (action.type === 'mark_complete') {
      update.status = 'done';
      notificationMessage = `"${task.title}" moved to Done.`;
      logMessage = `marked task "${task.title}" as completed from an AI suggestion.`;
    }

    const updatedTask = await Task.findByIdAndUpdate(task._id, update, { new: true, runValidators: true })
      .populate('assignee', 'name email avatar title')
      .populate('comments.userId', 'name email avatar title');

    await ActivityLog.create({ projectId: project._id, userId, message: logMessage });

    const nextAssigneeId = normalizeId(updatedTask.assignee);
    if (action.type === 'reassign_task' && nextAssigneeId && nextAssigneeId !== previousAssigneeId) {
      await notifyTaskEvent(req, nextAssigneeId, notificationType, notificationMessage, updatedTask, project);
    } else if (notificationMessage) {
      const recipients = uniqueIds([nextAssigneeId, project.owner]).filter(id => id && id !== userId);
      await Promise.all(recipients.map(id => notifyTaskEvent(req, id, notificationType, notificationMessage, updatedTask, project)));
    }


    res.json({ success: true, message: 'AI action applied successfully', data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to apply AI action' });
  }
};


const PROJECT_CREATOR_CONTEXT_LIMIT = 120;

const buildWorkspaceContext = async (userId) => {
  const projects = await Project.find({ $or: [{ owner: userId }, { members: userId }] })
    .populate('owner', 'name email avatar title')
    .populate('members', 'name email avatar title')
    .limit(50);
  const projectIds = projects.map(project => project._id);
  const tasks = await Task.find({ projectId: { $in: projectIds } })
    .populate('assignee', 'name email avatar title')
    .limit(PROJECT_CREATOR_CONTEXT_LIMIT);

  const usersById = new Map();
  const addUser = (user) => {
    const id = getObjectId(user);
    if (!id) return;
    usersById.set(id, {
      id,
      name: user?.name || 'Unknown user',
      email: user?.email || '',
      role: user?.title || '',
    });
  };

  projects.forEach(project => {
    addUser(project.owner);
    (project.members || []).forEach(addUser);
  });

  if (!usersById.has(userId)) {
    const currentUser = await User.findById(userId).select('name email avatar title');
    addUser(currentUser);
  }

  const workload = new Map();
  tasks.forEach(task => {
    const assigneeId = getObjectId(task.assignee);
    if (!assigneeId) return;
    const current = workload.get(assigneeId) || { assigneeId, activeTasks: 0, totalEstimatedHours: 0 };
    if (task.status !== 'done') current.activeTasks += 1;
    current.totalEstimatedHours += Number(task.estimatedHours) || 0;
    workload.set(assigneeId, current);
  });

  return {
    availableUsers: [...usersById.values()].map(user => ({
      ...user,
      workload: workload.get(user.id) || { assigneeId: user.id, activeTasks: 0, totalEstimatedHours: 0 },
    })),
    currentProjects: projects.map(project => ({
      id: project._id.toString(),
      name: project.name,
      description: project.description || '',
      deadline: project.deadline || null,
      owner: project.owner?.name || '',
      memberCount: (project.members || []).length,
    })),
  };
};

const normalizeDateOrNull = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : null;
const normalizePriorityForCreate = (priority) => allowedPriorities.includes(String(priority || '').toLowerCase()) ? String(priority).toLowerCase() : 'medium';
const normalizeTaskStatusForCreate = (status) => ['todo', 'in_progress', 'review', 'done'].includes(String(status || '').toLowerCase()) ? String(status).toLowerCase() : 'todo';

const flattenCreatorTasks = (projectDraft) => {
  const tasks = [];
  (projectDraft?.milestones || []).forEach((milestone) => {
    (milestone.epics || []).forEach((epic) => {
      (epic.tasks || []).forEach((task) => {
        tasks.push({
          ...task,
          milestone: milestone.title || '',
          phase: milestone.phase || milestone.title || '',
          epic: epic.title || '',
        });
      });
    });
  });
  return tasks;
};

const getDraftAssigneeIds = (projectDraft) => {
  const ids = [
    ...(projectDraft?.team || []).map(member => member.userId),
    ...flattenCreatorTasks(projectDraft).map(task => task.suggestedAssigneeId),
  ].filter(Boolean);
  return uniqueIds(ids);
};

const validateCreatorDraft = async (projectDraft, userId) => {
  if (!projectDraft || typeof projectDraft !== 'object' || Array.isArray(projectDraft)) {
    return { error: { status: 400, message: 'A reviewed AI project draft object is required' } };
  }

  if (!projectDraft.name || !String(projectDraft.name).trim()) {
    return { error: { status: 400, message: 'Missing required field: project.name' } };
  }

  if (projectDraft.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(String(projectDraft.deadline))) {
    return { error: { status: 400, message: 'Invalid field: project.deadline must use YYYY-MM-DD format' } };
  }

  if (!Array.isArray(projectDraft.milestones) || projectDraft.milestones.length === 0) {
    return { error: { status: 400, message: 'Missing required field: project.milestones must contain at least one milestone' } };
  }

  for (const [milestoneIndex, milestone] of projectDraft.milestones.entries()) {
    if (!milestone?.title || !String(milestone.title).trim()) {
      return { error: { status: 400, message: `Missing required field: project.milestones[${milestoneIndex}].title` } };
    }
    if (milestone.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(milestone.dueDate))) {
      return { error: { status: 400, message: `Invalid field: project.milestones[${milestoneIndex}].dueDate must use YYYY-MM-DD format` } };
    }
    if (!Array.isArray(milestone.epics) || milestone.epics.length === 0) {
      return { error: { status: 400, message: `Missing required field: project.milestones[${milestoneIndex}].epics must contain at least one epic` } };
    }
  }

  const tasks = flattenCreatorTasks(projectDraft);
  if (tasks.length === 0) {
    return { error: { status: 400, message: 'Missing required field: at least one generated task is required before creating the project' } };
  }

  for (const [taskIndex, task] of tasks.entries()) {
    if (!task.title || !String(task.title).trim()) {
      return { error: { status: 400, message: `Missing required field: task[${taskIndex}].title` } };
    }
    if (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(task.dueDate))) {
      return { error: { status: 400, message: `Invalid field: task[${taskIndex}].dueDate must use YYYY-MM-DD format` } };
    }
    if (task.estimatedHours !== undefined && !Number.isFinite(Number(task.estimatedHours))) {
      return { error: { status: 400, message: `Invalid field: task[${taskIndex}].estimatedHours must be numeric` } };
    }
  }

  const assigneeIds = getDraftAssigneeIds(projectDraft).filter(id => id !== userId);
  const invalidObjectId = assigneeIds.find(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidObjectId) {
    return { error: { status: 400, message: `Invalid assignee id: ${invalidObjectId}` } };
  }

  const allowedUsers = await User.find({ _id: { $in: uniqueIds([userId, ...assigneeIds]) } }).select('name email avatar title');
  const allowedIds = new Set(allowedUsers.map(user => user._id.toString()));
  const missingAssignee = assigneeIds.find(id => !allowedIds.has(id));

  if (missingAssignee) {
    return { error: { status: 400, message: `Invalid assignee: ${missingAssignee} does not belong to the available workspace users` } };
  }

  return { tasks, users: allowedUsers };
};

const emitCreatedProjectNotifications = (req, notifications) => {
  const io = req.app.get('io');
  if (!io) return;

  notifications.forEach(notification => {
    io.to(notification.userId.toString()).emit('notification_received', notification);
    io.to(notification.userId.toString()).emit('task_notification', {
      type: notification.type,
      message: notification.message,
      metadata: notification.metadata,
      notification,
    });
  });
};

exports.generateAIProjectPreview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Project description is required' });
    }

    const workspaceContext = await buildWorkspaceContext(userId);
    const result = await callDeepSeekProjectCreator({
      message,
      conversationHistory,
      workspaceContext,
      userId: sanitizeDeepSeekUserId(userId),
    });

    res.json({
      success: true,
      response: result.response,
      needsMoreInfo: result.needsMoreInfo,
      questions: result.questions || [],
      project: result.project || null,
    });
  } catch (error) {
    if (error instanceof DeepSeekError) {
      const payload = { success: false, message: error.message, code: error.code };
      if (process.env.NODE_ENV !== 'production') {
        payload.rawResponse = error.rawResponse || null;
        payload.parseError = error.parseError || null;
      }
      return res.status(error.statusCode).json(payload);
    }
    res.status(500).json({ success: false, message: 'AI project creator request failed' });
  }
};

exports.createAIProject = async (req, res) => {
  const session = await mongoose.startSession();
  const notificationsToEmit = [];

  try {
    const userId = getUserId(req);
    const { project } = req.body;
    const validation = await validateCreatorDraft(project, userId);

    if (validation.error) {
      session.endSession();
      return res.status(validation.error.status).json({ success: false, message: validation.error.message });
    }

    let createdProject;
    let createdTasks = [];

    await session.withTransaction(async () => {
      const memberIds = uniqueIds([userId, ...getDraftAssigneeIds(project)]);
      const projectDocs = await Project.create([{
        name: String(project.name || '').trim(),
        description: String(project.description || '').trim(),
        theme: project.theme || '#7c3aed',
        icon: project.icon || 'folder',
        priority: normalizePriorityForCreate(project.priority),
        deadline: normalizeDateOrNull(project.deadline),
        visibility: project.visibility || 'private',
        owner: userId,
        members: memberIds,
        category: String(project.category || '').trim(),
        techStack: Array.isArray(project.techStack) ? project.techStack.map(item => String(item).trim()).filter(Boolean) : [],
        timeline: String(project.timeline || project.estimatedDuration || '').trim(),
        goals: Array.isArray(project.goals) ? project.goals.map(item => String(item).trim()).filter(Boolean) : [],
        milestones: (project.milestones || []).map(milestone => ({
          title: String(milestone.title || '').trim(),
          description: String(milestone.description || '').trim(),
          dueDate: normalizeDateOrNull(milestone.dueDate),
          phase: String(milestone.phase || '').trim(),
        })),
        aiMetadata: {
          generatedBy: 'TaskPilot AI',
          createdFromAI: true,
          estimatedHours: Number(project.estimatedWorkloadHours) || validation.tasks.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0),
          riskAnalysis: (project.riskAnalysis || []).map(risk => ({
            title: String(risk.title || '').trim(),
            level: String(risk.level || 'Low').trim(),
            mitigation: String(risk.mitigation || '').trim(),
          })),
        },
      }], { session, ordered: true });

      createdProject = projectDocs[0];

      const taskDocs = validation.tasks.map(task => ({
        projectId: createdProject._id,
        title: String(task.title || 'Untitled task').trim().slice(0, 100),
        description: String(task.description || '').trim().slice(0, 300),
        taskType: String(task.taskType || 'feature').trim(),
        priority: normalizePriorityForCreate(task.priority),
        status: normalizeTaskStatusForCreate(task.status),
        assignee: task.suggestedAssigneeId || null,
        dueDate: normalizeDateOrNull(task.dueDate),
        dueTime: task.dueTime || null,
        milestone: String(task.milestone || '').trim(),
        phase: String(task.phase || '').trim(),
        epic: String(task.epic || '').trim(),
        estimatedHours: Number(task.estimatedHours) || 0,
        dependencies: Array.isArray(task.dependencies) ? task.dependencies.map(item => String(item).trim()).filter(Boolean) : [],
        subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(subtask => ({
          title: String(subtask.title || '').trim(),
          description: String(subtask.description || '').trim(),
          status: normalizeTaskStatusForCreate(subtask.status),
          estimatedHours: Number(subtask.estimatedHours) || 0,
        })).filter(subtask => subtask.title) : [],
        comments: [],
      }));

      createdTasks = await Task.insertMany(taskDocs, { session, ordered: true });

      await ActivityLog.create([{
        projectId: createdProject._id,
        userId,
        message: `created project "${createdProject.name}" with TaskPilot AI.`
      }, {
        projectId: createdProject._id,
        userId,
        message: `generated ${createdTasks.length} tasks from an AI project plan.`
      }], { session, ordered: true });

      await Conversation.findOneAndUpdate(
        { type: 'project', projectId: createdProject._id },
        { type: 'project', projectId: createdProject._id, participants: memberIds },
        { new: true, upsert: true, setDefaultsOnInsert: true, session }
      );

      const notificationDocs = [];
      memberIds.filter(id => id !== userId).forEach(memberId => {
        notificationDocs.push({
          userId: memberId,
          type: 'task_assigned',
          message: `You were added to AI-created project "${createdProject.name}".`,
          metadata: {
            projectId: normalizeId(createdProject._id),
            projectName: createdProject.name,
            link: `/projects/${normalizeId(createdProject._id)}`,
          },
        });
      });

      createdTasks.filter(task => task.assignee && task.assignee.toString() !== userId).forEach(task => {
        notificationDocs.push({
          userId: task.assignee,
          type: 'task_assigned',
          message: `You were assigned to "${task.title}" in "${createdProject.name}".`,
          metadata: {
            projectId: normalizeId(createdProject._id),
            projectName: createdProject.name,
            taskId: normalizeId(task._id),
            taskTitle: task.title,
            link: `/projects/${normalizeId(createdProject._id)}/tasks/${normalizeId(task._id)}`,
          },
        });
      });

      if (notificationDocs.length > 0) {
        const notifications = await Notification.insertMany(notificationDocs, { session, ordered: true });
        notificationsToEmit.push(...notifications);
      }
    });

    session.endSession();
    emitCreatedProjectNotifications(req, notificationsToEmit);

    const populatedProject = await Project.findById(createdProject._id)
      .populate('owner', 'name email avatar title')
      .populate('members', 'name email avatar title');
    const populatedTasks = await Task.find({ projectId: createdProject._id })
      .populate('assignee', 'name email avatar title')
      .populate('comments.userId', 'name email avatar title');

    const createdSubtasks = populatedTasks.reduce((sum, task) => sum + (Array.isArray(task.subtasks) ? task.subtasks.length : 0), 0);

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      projectId: normalizeId(createdProject._id),
      projectName: createdProject.name,
      createdProjects: 1,
      createdMilestones: Array.isArray(project.milestones) ? project.milestones.length : 0,
      createdTasks: populatedTasks.length,
      createdSubtasks,
      data: {
        project: populatedProject,
        tasks: populatedTasks,
      },
    });
  } catch (error) {
    session.endSession();
    res.status(500).json({ success: false, message: error.message || 'Failed to create AI project' });
  }
};
exports.testDeepSeekConnection = async (req, res) => {
  try {
    const aiResponse = await callDeepSeekChat({
      message: 'Say Hello from TaskPilot AI.',
      conversationHistory: [],
      userId: sanitizeDeepSeekUserId(getUserId(req)),
    });

    res.json({ success: true, message: 'DeepSeek connected successfully', response: aiResponse.response });
  } catch (error) {
    if (error instanceof DeepSeekError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }

    res.status(500).json({ success: false, message: 'DeepSeek test request failed' });
  }
};
