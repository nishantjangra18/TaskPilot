export const getTaskId = value => String(value?._id || value?.id || value || '');

const norm = value => String(value || '').toLowerCase().trim();
const unique = values => [...new Set(values.filter(Boolean))];

const dependencyRules = [
  { label: 'Backend APIs', targets: ['dashboard', 'frontend', 'ui', 'screen', 'page', 'client'], sources: ['api', 'backend', 'endpoint', 'server', 'controller'], reason: 'Frontend work usually needs backend API contracts before integration.' },
  { label: 'Authentication', targets: ['dashboard', 'profile', 'payment', 'checkout', 'admin', 'settings', 'account'], sources: ['auth', 'login', 'register', 'session', 'jwt', 'oauth', 'authentication'], reason: 'This task depends on authenticated user access.' },
  { label: 'Database Schema', targets: ['api', 'backend', 'payment', 'profile', 'report', 'analytics', 'dashboard'], sources: ['database', 'schema', 'model', 'mongo', 'db', 'migration'], reason: 'Data-driven work needs the underlying schema or model first.' },
  { label: 'Testing', targets: ['deploy', 'deployment', 'release', 'launch', 'production'], sources: ['test', 'testing', 'qa', 'quality', 'bug fix', 'bugfix'], reason: 'Deployment should wait until testing and bug fixes are complete.' },
  { label: 'Documentation', targets: ['deploy', 'deployment', 'release', 'handoff'], sources: ['documentation', 'docs', 'readme', 'guide'], reason: 'Release and handoff work should include documentation readiness.' },
  { label: 'User Profile', targets: ['payment', 'checkout', 'billing', 'subscription'], sources: ['profile', 'user account', 'account'], reason: 'Payment flows usually need stable user profile/account data.' },
  { label: 'Design', targets: ['frontend', 'ui', 'screen', 'page', 'component'], sources: ['design', 'wireframe', 'figma', 'prototype', 'ux'], reason: 'UI implementation is safer after design direction is clear.' },
  { label: 'Implementation', targets: ['testing', 'qa', 'review'], sources: ['build', 'implement', 'feature', 'frontend', 'backend', 'api'], reason: 'Testing work depends on implementation being available to verify.' },
];

const taskText = task => norm(`${task?.title || ''} ${task?.description || ''} ${task?.priority || ''} ${task?.milestone || ''} ${task?.sprint || ''} ${task?.phase || ''} ${task?.epic || ''} ${task?.taskType || task?.type || ''}`);
const matchesAny = (text, words) => words.some(word => text.includes(norm(word)));

export const resolveDependencyTask = (dependency, projectTasks) => {
  const dep = norm(dependency);
  if (!dep) return null;
  return projectTasks.find(task => {
    const id = getTaskId(task);
    const title = norm(task.title);
    return dep === norm(id) || dep === title || title.includes(dep) || dep.includes(title);
  }) || null;
};

export const getAcceptedDependencies = (task, projectTasks) => {
  const dependencies = Array.isArray(task?.dependencies) ? task.dependencies : [];
  return dependencies.map(dep => ({ raw: dep, task: resolveDependencyTask(dep, projectTasks) })).filter(item => item.task);
};

export const detectDependencySuggestions = (task, projectTasks) => {
  if (!task) return [];
  const currentId = getTaskId(task);
  const currentText = taskText(task);
  const acceptedIds = getAcceptedDependencies(task, projectTasks).map(item => getTaskId(item.task));

  return dependencyRules.flatMap(rule => {
    if (!matchesAny(currentText, rule.targets)) return [];
    return projectTasks
      .filter(candidate => getTaskId(candidate) !== currentId)
      .filter(candidate => !acceptedIds.includes(getTaskId(candidate)))
      .filter(candidate => matchesAny(taskText(candidate), rule.sources))
      .map(candidate => ({ task: candidate, reason: rule.reason, label: rule.label, confidence: confidenceFor(task, candidate, rule) }));
  })
    .sort((a, b) => b.confidence - a.confidence)
    .filter((item, index, all) => all.findIndex(other => getTaskId(other.task) === getTaskId(item.task)) === index)
    .slice(0, 5);
};

const confidenceFor = (task, candidate, rule) => {
  let score = 66;
  if (task?.priority === 'high' || task?.priority === 'critical') score += 6;
  if (candidate?.status === 'done') score += 5;
  if (norm(task?.milestone) && norm(task?.milestone) === norm(candidate?.milestone)) score += 8;
  if (norm(task?.phase) && norm(task?.phase) === norm(candidate?.phase)) score += 5;
  if (matchesAny(norm(candidate?.title), rule.sources)) score += 8;
  return Math.min(96, score);
};

export const getTaskDependencyView = (task, projectTasks) => {
  const currentId = getTaskId(task);
  const blockedBy = getAcceptedDependencies(task, projectTasks).map(item => item.task);
  const blocks = projectTasks.filter(candidate => getAcceptedDependencies(candidate, projectTasks).some(item => getTaskId(item.task) === currentId));
  const suggestions = detectDependencySuggestions(task, projectTasks);
  return { blockedBy, blocks, suggestions };
};

const dependencyEdges = projectTasks => projectTasks.flatMap(task => getAcceptedDependencies(task, projectTasks).map(dep => ({ from: getTaskId(dep.task), to: getTaskId(task), dependency: dep.task, task })));

const findCircularDependencies = (projectTasks, edges) => {
  const outgoing = new Map(projectTasks.map(task => [getTaskId(task), []]));
  edges.forEach(edge => outgoing.get(edge.from)?.push(edge.to));
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const path = [];

  const visit = id => {
    if (visiting.has(id)) {
      const cycle = path.slice(path.indexOf(id)).concat(id);
      cycles.push(cycle);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    path.push(id);
    (outgoing.get(id) || []).forEach(visit);
    path.pop();
    visiting.delete(id);
    visited.add(id);
  };

  projectTasks.forEach(task => visit(getTaskId(task)));
  return cycles;
};

const titleOf = (id, projectTasks) => projectTasks.find(task => getTaskId(task) === id)?.title || 'Unknown task';

const criticalPath = (projectTasks, edges) => {
  const byFrom = new Map();
  edges.forEach(edge => byFrom.set(edge.from, [...(byFrom.get(edge.from) || []), edge.to]));
  const weight = task => Number(task?.estimatedHours || 0) || ({ critical: 12, high: 8, medium: 5, low: 2 }[task?.priority] || 4);
  const memo = new Map();

  const walk = id => {
    if (memo.has(id)) return memo.get(id);
    const task = projectTasks.find(item => getTaskId(item) === id);
    const children = byFrom.get(id) || [];
    const bestChild = children.map(walk).sort((a, b) => b.hours - a.hours)[0] || { ids: [], hours: 0 };
    const result = { ids: [id, ...bestChild.ids], hours: (task ? weight(task) : 0) + bestChild.hours };
    memo.set(id, result);
    return result;
  };

  return projectTasks.map(task => walk(getTaskId(task))).sort((a, b) => b.hours - a.hours)[0] || { ids: [], hours: 0 };
};

export const analyzeProjectDependencies = (projectTasks = []) => {
  const edges = dependencyEdges(projectTasks);
  const suggestions = projectTasks.flatMap(task => detectDependencySuggestions(task, projectTasks).map(suggestion => ({ task, dependency: suggestion.task, reason: suggestion.reason, confidence: suggestion.confidence })));
  const blockedTasks = projectTasks.filter(task => task.status !== 'done' && getAcceptedDependencies(task, projectTasks).some(dep => dep.task.status !== 'done'));
  const missingDependencies = projectTasks.flatMap(task => (task.dependencies || []).filter(dep => !resolveDependencyTask(dep, projectTasks)).map(dep => ({ task, dependency: dep })));
  const cycles = findCircularDependencies(projectTasks, edges);
  const path = criticalPath(projectTasks, edges);
  const highPriorityBlocked = blockedTasks.filter(task => ['high', 'critical'].includes(task.priority));
  const withoutDependencies = projectTasks.filter(task => getAcceptedDependencies(task, projectTasks).length === 0 && !suggestions.some(item => getTaskId(item.task) === getTaskId(task)));

  const risks = [
    ...cycles.map(cycle => ({ type: 'Circular dependency', severity: 'Critical', description: cycle.map(id => titleOf(id, projectTasks)).join(' -> ') })),
    ...missingDependencies.map(item => ({ type: 'Missing dependency', severity: 'High', description: `${item.task.title} references ${item.dependency}, but no matching task exists.` })),
    ...(highPriorityBlocked.length ? [{ type: 'High priority task blocked', severity: 'High', description: `${highPriorityBlocked.length} high priority task${highPriorityBlocked.length === 1 ? ' is' : 's are'} waiting on unfinished dependencies.` }] : []),
    ...(path.ids.some(id => projectTasks.find(task => getTaskId(task) === id)?.status !== 'done' && blockedTasks.some(task => getTaskId(task) === id)) ? [{ type: 'Critical path blocked', severity: 'High', description: 'At least one task on the critical path is blocked by unfinished work.' }] : []),
  ];

  return {
    tasks: projectTasks,
    connections: edges,
    suggestions,
    blockedTasks,
    missingDependencies,
    circularDependencies: cycles,
    criticalPath: { ...path, tasks: path.ids.map(id => projectTasks.find(task => getTaskId(task) === id)).filter(Boolean) },
    risks,
    withoutDependencies,
  };
};

export const dependencyFilterOptions = [
  ['all', 'All Tasks'],
  ['blocked', 'Blocked Tasks'],
  ['critical', 'Critical Tasks'],
  ['without', 'Tasks Without Dependencies'],
];

export const filterDependencyTasks = (analysis, filter) => {
  if (!analysis) return [];
  if (filter === 'blocked') return analysis.blockedTasks;
  if (filter === 'critical') return analysis.tasks.filter(task => ['high', 'critical'].includes(task.priority));
  if (filter === 'without') return analysis.withoutDependencies;
  return analysis.tasks;
};

export const mergeDependency = (task, dependencyTask) => unique([...(task?.dependencies || []), getTaskId(dependencyTask)]);
