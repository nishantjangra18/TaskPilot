const DAY_MS = 86400000;

export const getId = value => String(value?._id || value?.id || value || '');
export const norm = value => String(value || '').toLowerCase().trim();

const today = () => new Date(new Date().toDateString());
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const pad = value => String(value).padStart(2, '0');
const dateValue = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const parseDate = value => {
  if (!value) return null;
  const date = new Date(`${value}T23:59:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = value => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return 'Not planned';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const daysBetween = (from, to) => Math.ceil((to - from) / DAY_MS);
export const taskDueDate = task => parseDate(task?.dueDate);
export const daysUntilTask = task => {
  const due = taskDueDate(task);
  if (!due) return 999;
  return daysBetween(today(), due);
};

export const estimatedHours = task => {
  const explicit = Number(task?.estimatedHours || 0);
  if (explicit > 0) return explicit;
  const subtaskHours = (task?.subtasks || []).reduce((sum, subtask) => sum + (Number(subtask?.estimatedHours) || 0), 0);
  if (subtaskHours > 0) return subtaskHours;
  return ({ critical: 12, high: 8, medium: 5, low: 2 }[task?.priority] || 4);
};

const priorityWeight = priority => ({ critical: 1.8, high: 1.4, medium: 1, low: 0.7 }[priority] || 1);
const severityScore = severity => ({ Low: 8, Medium: 15, High: 24, Critical: 34 }[severity] || 10);
const riskStatus = score => score <= 30 ? 'Healthy' : score <= 60 ? 'Medium Risk' : 'High Risk';
const riskTone = score => score <= 30 ? 'healthy' : score <= 60 ? 'medium' : 'high';
const skillLevel = value => ({ expert: 4, advanced: 3, intermediate: 2, beginner: 1 }[norm(value)] || 1);

const projectMembers = (project, users, currentUser) => {
  const map = new Map((users || []).map(user => [getId(user), user]));
  if (currentUser) map.set(getId(currentUser), { ...map.get(getId(currentUser)), ...currentUser });
  const ids = [...new Set([getId(project?.owner), ...(project?.members || []).map(getId)].filter(Boolean))];
  return ids.map(id => ({ ...(project?.members || []).find(member => getId(member) === id), ...(map.get(id) || {}), id })).filter(member => member.id);
};

const taskKeywords = task => {
  const text = norm(`${task?.title || ''} ${task?.description || ''} ${task?.taskType || ''} ${task?.phase || ''} ${task?.epic || ''} ${(task?.dependencies || []).join(' ')}`);
  const catalog = [
    ['Backend', ['backend', 'api', 'server', 'endpoint', 'auth', 'database', 'mongo', 'schema', 'node', 'express']],
    ['Frontend', ['frontend', 'react', 'ui', 'component', 'tailwind', 'css', 'screen', 'page']],
    ['Testing', ['test', 'testing', 'qa', 'quality', 'bug', 'automation', 'unit', 'e2e']],
    ['Deployment', ['deploy', 'deployment', 'release', 'hosting', 'ci', 'cd', 'docker', 'pipeline']],
    ['Design', ['design', 'figma', 'wireframe', 'prototype', 'ux']],
    ['AI', ['ai', 'model', 'prompt', 'ml', 'deepseek', 'openai']],
  ];
  return catalog.filter(([, words]) => words.some(word => text.includes(word))).map(([name]) => name);
};

const memberSkillScore = (member, task) => {
  const required = taskKeywords(task);
  if (!required.length) return { score: 1, matches: [] };
  const skills = member?.skills || [];
  const matches = skills.filter(skill => required.some(requiredSkill => norm(skill.name).includes(norm(requiredSkill)) || norm(requiredSkill).includes(norm(skill.name))));
  return {
    score: matches.reduce((sum, skill) => sum + skillLevel(skill.proficiency), 0),
    matches: matches.map(skill => skill.name),
  };
};

const hasTeamSkill = (members, label) => members.some(member => (member.skills || []).some(skill => norm(skill.name).includes(norm(label)) || norm(label).includes(norm(skill.name))));
const displayName = member => member?.name || member?.email || 'Unassigned';
const assigneeId = task => getId(task?.assignee || task?.assigneeId);

const resolveDependencies = (task, projectTasks) => {
  const deps = task?.dependencies || [];
  if (!deps.length) return { missing: [], blockedByOpen: [] };
  const missing = [];
  const blockedByOpen = [];
  deps.forEach(dep => {
    const depText = norm(dep);
    const matched = projectTasks.find(candidate => getId(candidate) === dep || norm(candidate.title) === depText || norm(candidate.title).includes(depText));
    if (!matched) missing.push(dep);
    else if (matched.status !== 'done') blockedByOpen.push(matched);
  });
  return { missing, blockedByOpen };
};

const makeRisk = (id, title, description, severity, evidence = '') => ({ id, title, description, severity, evidence });
const makeRecommendation = config => ({ dismissed: false, ...config });

export const analyzeProjectRisk = ({ project, tasks = [], users = [], currentUser }) => {
  if (!project) return null;

  const projectId = getId(project);
  const projectTasks = tasks.filter(task => getId(task.projectId) === projectId);
  const activeTasks = projectTasks.filter(task => task.status !== 'done');
  const completedTasks = projectTasks.filter(task => task.status === 'done');
  const overdueTasks = activeTasks.filter(task => daysUntilTask(task) < 0);
  const unassignedTasks = activeTasks.filter(task => !assigneeId(task));
  const highPriorityOpen = activeTasks.filter(task => ['critical', 'high'].includes(task.priority));
  const members = projectMembers(project, users, currentUser);
  const now = today();
  const plannedDate = parseDate(project.deadline) || projectTasks.map(taskDueDate).filter(Boolean).sort((a, b) => b - a)[0] || null;
  const remainingWeightedHours = activeTasks.reduce((sum, task) => sum + estimatedHours(task) * priorityWeight(task.priority), 0);
  const completedWeightedHours = completedTasks.reduce((sum, task) => sum + estimatedHours(task) * priorityWeight(task.priority), 0);
  const elapsedDays = Math.max(1, daysBetween(parseDate(project.createdAt?.slice?.(0, 10)) || new Date(project.createdAt || now), now));
  const observedVelocity = completedWeightedHours > 0 ? completedWeightedHours / elapsedDays : 0;
  const capacityVelocity = members.reduce((sum, member) => sum + Math.max(1, Number(member.capacity ?? 40)) / 5, 0);
  const dailyVelocity = Math.max(1, observedVelocity || capacityVelocity || members.length * 4 || 3);
  const predictedDate = addDays(now, Math.ceil(remainingWeightedHours / dailyVelocity));
  const delayDays = plannedDate ? Math.max(0, daysBetween(plannedDate, predictedDate)) : 0;
  const completionRate = projectTasks.length ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;

  const memberHealth = members.map(member => {
    const assigned = projectTasks.filter(task => assigneeId(task) === member.id);
    const active = assigned.filter(task => task.status !== 'done');
    const overdue = active.filter(task => daysUntilTask(task) < 0);
    const weightedHours = active.reduce((sum, task) => sum + estimatedHours(task) * priorityWeight(task.priority), 0);
    const capacity = Math.max(1, Number(member.capacity ?? 40));
    const workload = Math.round((weightedHours / capacity) * 100);
    const skillScores = active.map(task => memberSkillScore(member, task).score);
    const skillMatch = active.length ? Math.round((skillScores.filter(Boolean).length / active.length) * 100) : 100;
    const riskLevel = workload >= 120 || overdue.length >= 3 ? 'Critical' : workload >= 95 || overdue.length ? 'High' : workload >= 75 ? 'Medium' : 'Low';
    return { member, id: member.id, assigned, active, overdue, weightedHours: Math.round(weightedHours), capacity, workload, availableCapacity: Math.max(0, Math.round(capacity - weightedHours)), skillMatch, riskLevel };
  });

  const risks = [];
  const recommendations = [];
  const addRisk = risk => risks.push(risk);
  const addRecommendation = rec => recommendations.push(makeRecommendation({ id: `${rec.type}-${recommendations.length}`, ...rec }));

  if (overdueTasks.length >= 3 || overdueTasks.length > activeTasks.length * 0.25) {
    addRisk(makeRisk('overdue-volume', 'Too Many Overdue Tasks', `${overdueTasks.length} active task${overdueTasks.length === 1 ? '' : 's'} already passed their due date.`, overdueTasks.length >= 6 ? 'Critical' : 'High', `${overdueTasks.slice(0, 3).map(task => task.title).join(', ')}`));
  }

  const overloaded = memberHealth.filter(stat => stat.workload >= 100);
  overloaded.forEach(stat => addRisk(makeRisk(`overload-${stat.id}`, 'Single Member Overloaded', `${displayName(stat.member)} is carrying ${stat.workload}% workload with ${stat.active.length} active task${stat.active.length === 1 ? '' : 's'}.`, stat.workload >= 130 ? 'Critical' : 'High', `${stat.weightedHours}h assigned / ${stat.capacity}h capacity`)));

  if (activeTasks.some(task => taskKeywords(task).includes('Backend')) && !hasTeamSkill(members, 'Backend') && !hasTeamSkill(members, 'Node')) {
    addRisk(makeRisk('missing-backend', 'No Backend Developer Assigned', 'Backend/API/database work exists, but the current team has no visible backend skill coverage.', 'High', 'Add backend skills on profiles or invite a backend-capable member.'));
  }

  if (plannedDate && delayDays >= 2) {
    addRisk(makeRisk('deadline-unrealistic', 'Deadline Unrealistic', `Current velocity predicts completion ${delayDays} day${delayDays === 1 ? '' : 's'} after the planned date.`, delayDays >= 7 ? 'Critical' : 'High', `${formatDate(plannedDate)} planned vs ${formatDate(predictedDate)} predicted`));
  }

  activeTasks.forEach(task => {
    const deps = resolveDependencies(task, projectTasks);
    if (deps.blockedByOpen.length && ['critical', 'high'].includes(task.priority)) {
      addRisk(makeRisk(`blocked-${getId(task)}`, 'Critical Task Blocked', `${task.title} depends on unfinished work.`, task.priority === 'critical' ? 'Critical' : 'High', `Blocked by ${deps.blockedByOpen.slice(0, 2).map(item => item.title).join(', ')}`));
    }
    if (deps.missing.length) {
      addRisk(makeRisk(`missing-deps-${getId(task)}`, 'Missing Dependencies', `${task.title} references dependencies that do not match tracked tasks.`, 'Medium', deps.missing.slice(0, 3).join(', ')));
    }
  });

  if (unassignedTasks.length) {
    addRisk(makeRisk('unassigned-tasks', 'Tasks Without Assignees', `${unassignedTasks.length} active task${unassignedTasks.length === 1 ? ' is' : 's are'} not assigned to anyone.`, unassignedTasks.length >= 4 ? 'High' : 'Medium', unassignedTasks.slice(0, 3).map(task => task.title).join(', ')));
  }

  const mismatched = activeTasks.filter(task => {
    const owner = memberHealth.find(stat => stat.id === assigneeId(task));
    return owner && taskKeywords(task).length && memberSkillScore(owner.member, task).score === 0;
  });
  if (mismatched.length) addRisk(makeRisk('skills-mismatch', 'Skills Mismatch', `${mismatched.length} assigned task${mismatched.length === 1 ? '' : 's'} do not match visible member skills.`, 'Medium', mismatched.slice(0, 3).map(task => task.title).join(', ')));

  const hasTestingPhase = projectTasks.some(task => taskKeywords(task).includes('Testing')) || (project.milestones || []).some(item => norm(`${item.title} ${item.phase}`).includes('test'));
  const hasDeploymentPhase = projectTasks.some(task => taskKeywords(task).includes('Deployment')) || (project.milestones || []).some(item => /deploy|release|launch/i.test(`${item.title} ${item.phase}`));
  if (projectTasks.length >= 5 && !hasTestingPhase) addRisk(makeRisk('no-testing', 'No Testing Phase', 'The project has multiple tracked tasks but no visible QA/testing work.', 'Medium', 'Add testing before review and release.'));
  if (projectTasks.length >= 5 && !hasDeploymentPhase) addRisk(makeRisk('no-deployment', 'No Deployment Phase', 'No deployment or release task is visible in the current plan.', 'Medium', 'Add deployment ownership before the deadline.'));

  if (remainingWeightedHours > members.length * 45 && members.length <= 2) {
    addRisk(makeRisk('large-sprint-small-team', 'Large Sprint With Too Few Members', `${Math.round(remainingWeightedHours)}h of weighted work remains for ${members.length || 0} member${members.length === 1 ? '' : 's'}.`, 'High', 'Reduce scope or add members.'));
  }

  unassignedTasks.slice(0, 3).forEach(task => {
    const best = [...memberHealth].sort((a, b) => memberSkillScore(b.member, task).score - memberSkillScore(a.member, task).score || a.workload - b.workload)[0];
    if (!best) return;
    addRecommendation({
      type: 'assign-unassigned',
      title: `Assign ${task.title}`,
      description: `${task.title} has no owner. ${displayName(best.member)} has the best available fit among current members.`,
      preview: `Set assignee to ${displayName(best.member)} using the existing task update API.`,
      severity: task.priority === 'critical' ? 'Critical' : 'High',
      action: { kind: 'editTask', taskId: getId(task), updates: { assigneeId: best.id } },
    });
  });

  overloaded.forEach(from => {
    const task = [...from.active].sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || estimatedHours(b) - estimatedHours(a))[0];
    const to = memberHealth.filter(stat => stat.id !== from.id && stat.workload < 85).sort((a, b) => b.availableCapacity - a.availableCapacity)[0];
    if (!task || !to) return;
    addRecommendation({
      type: 'rebalance-overload',
      title: `Relieve ${displayName(from.member)}`,
      description: `${displayName(from.member)} is overloaded. Move one active task to ${displayName(to.member)} to reduce delivery risk.`,
      preview: `Move ${task.title} from ${displayName(from.member)} to ${displayName(to.member)}.`,
      severity: from.riskLevel,
      action: { kind: 'editTask', taskId: getId(task), updates: { assigneeId: to.id } },
    });
  });

  const riskyDueTask = highPriorityOpen.find(task => daysUntilTask(task) >= 0 && daysUntilTask(task) <= 2);
  if (riskyDueTask) {
    addRecommendation({
      type: 'move-task-deadline',
      title: `Move ${riskyDueTask.title} by 2 days`,
      description: 'A high-priority task is close to deadline and still active.',
      preview: `Update task due date from ${formatDate(riskyDueTask.dueDate)} to ${formatDate(addDays(taskDueDate(riskyDueTask) || now, 2))}.`,
      severity: 'Medium',
      action: { kind: 'editTask', taskId: getId(riskyDueTask), updates: { dueDate: dateValue(addDays(taskDueDate(riskyDueTask) || now, 2)) } },
    });
  }

  if (plannedDate && delayDays >= 2) {
    addRecommendation({
      type: 'extend-project-deadline',
      title: 'Move project deadline by 2 days',
      description: 'Predicted completion is later than the current plan.',
      preview: `Update planned completion from ${formatDate(plannedDate)} to ${formatDate(addDays(plannedDate, 2))}.`,
      severity: delayDays >= 7 ? 'Critical' : 'High',
      action: { kind: 'editProject', projectId, updates: { deadline: dateValue(addDays(plannedDate, 2)) } },
    });
  }

  if (!hasTestingPhase) {
    addRecommendation({ type: 'add-testing-phase', title: 'Add a testing phase', description: 'Create QA/testing work before release to reduce defect risk.', preview: 'Planning action only: add testing tasks in the project workspace.', severity: 'Medium', action: { kind: 'planning' } });
  }
  if (!hasDeploymentPhase) {
    addRecommendation({ type: 'add-deployment-phase', title: 'Add a deployment phase', description: 'Create deployment ownership before final delivery.', preview: 'Planning action only: add deployment/release tasks in the project workspace.', severity: 'Medium', action: { kind: 'planning' } });
  }

  const rawScore = risks.reduce((sum, risk) => sum + severityScore(risk.severity), 0)
    + (overdueTasks.length * 3)
    + Math.min(18, delayDays * 2)
    + Math.max(0, Math.round((remainingWeightedHours - members.length * 35) / 8));
  const score = clamp(Math.round(rawScore));
  const confidence = clamp(Math.round(62 + (projectTasks.length ? 12 : 0) + (members.length ? 8 : 0) + (projectTasks.some(task => task.estimatedHours) ? 8 : 0) + (plannedDate ? 6 : 0) + (completedTasks.length ? 4 : 0)), 45, 96);

  return {
    project,
    score,
    status: riskStatus(score),
    tone: riskTone(score),
    stats: { totalTasks: projectTasks.length, pendingTasks: activeTasks.length, completedTasks: completedTasks.length, overdueTasks: overdueTasks.length, completionRate, remainingHours: Math.round(remainingWeightedHours), teamSize: members.length },
    timeline: { plannedDate, predictedDate, delayDays, confidence, dailyVelocity: Math.round(dailyVelocity * 10) / 10 },
    teamHealth: memberHealth,
    risks: risks.sort((a, b) => severityScore(b.severity) - severityScore(a.severity)).slice(0, 12),
    recommendations: recommendations.slice(0, 10),
  };
};
