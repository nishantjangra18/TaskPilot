import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDown,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Gauge,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { TaskPilotSelect } from '../components/TaskPilotControls';

const getId = value => String(value?._id || value?.id || value || '');
const norm = value => String(value || '').toLowerCase().trim();
const today = () => new Date(new Date().toDateString());
const parseDue = task => {
  if (!task?.dueDate) return null;
  const date = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const daysUntil = task => {
  const due = parseDue(task);
  if (!due) return 999;
  return Math.ceil((due - today()) / 86400000);
};
const estimatedHours = task => {
  const explicit = Number(task?.estimatedHours || 0);
  if (explicit > 0) return explicit;
  const subtaskHours = (task?.subtasks || []).reduce((sum, subtask) => sum + (Number(subtask?.estimatedHours) || 0), 0);
  if (subtaskHours > 0) return subtaskHours;
  const base = task?.priority === 'critical' ? 10 : task?.priority === 'high' ? 7 : task?.priority === 'medium' ? 4 : 2;
  return task?.status === 'review' ? Math.max(1, Math.round(base * 0.35)) : base;
};
const priorityWeight = priority => ({ critical: 1.8, high: 1.4, medium: 1, low: 0.65 }[priority] || 1);
const skillWeight = proficiency => ({ expert: 4, advanced: 3, intermediate: 2, beginner: 1 }[norm(proficiency)] || 1);
const statusLabel = status => ({ todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }[status] || status || 'Open');
const statusTone = status => {
  if (status === 'Overloaded') return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/25 dark:text-rose-300 dark:border-rose-900/40';
  if (status === 'Busy') return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-900/40';
  if (status === 'Idle') return 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/25 dark:text-sky-300 dark:border-sky-900/40';
  return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/25 dark:text-emerald-300 dark:border-emerald-900/40';
};
const priorityTone = priority => ({ critical: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/25 dark:text-rose-300 dark:border-rose-900/40', high: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/25 dark:text-orange-300 dark:border-orange-900/40', medium: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-900/40', low: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700' }[priority] || 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700');
const availabilityText = user => {
  const availability = user?.availability;
  if (typeof availability === 'string' && availability.trim()) return availability;
  if (availability?.status) return availability.status;
  return Number(user?.capacity ?? 40) > 0 ? 'Available' : 'Unavailable';
};
const workingHoursText = user => {
  const availability = user?.availability;
  if (availability?.workingHours) return availability.workingHours;
  return `${Number(user?.capacity ?? 40)}h/week capacity`;
};

const taskKeywords = task => {
  const text = norm(`${task?.title || ''} ${task?.description || ''} ${task?.taskType || ''} ${(task?.dependencies || []).join(' ')}`);
  const map = [
    ['React', ['react', 'frontend', 'ui', 'component', 'dashboard', 'css', 'tailwind']],
    ['Node.js', ['node', 'express', 'api', 'backend', 'server', 'endpoint']],
    ['MongoDB', ['mongo', 'database', 'schema', 'query', 'index', 'db']],
    ['Testing', ['test', 'qa', 'bug', 'quality', 'automation', 'unit']],
    ['DevOps', ['deploy', 'ci', 'cd', 'docker', 'hosting', 'pipeline']],
    ['Design', ['figma', 'design', 'wireframe', 'ux', 'prototype']],
    ['AI', ['ai', 'ml', 'model', 'prompt', 'deepseek', 'openai']],
  ];
  return map.filter(([, words]) => words.some(word => text.includes(word))).map(([skill]) => skill);
};
const skillMatches = (user, task) => {
  const required = taskKeywords(task);
  const userSkills = user?.skills || [];
  if (!required.length) return { score: 1, matches: [] };
  const matches = userSkills.filter(skill => required.some(requiredSkill => norm(skill.name).includes(norm(requiredSkill)) || norm(requiredSkill).includes(norm(skill.name))));
  const score = matches.reduce((sum, skill) => sum + skillWeight(skill.proficiency), 0);
  return { score, matches: matches.map(skill => skill.name) };
};
const displayName = user => user?.name || user?.email || 'Unassigned';
const getTaskAssigneeId = task => getId(task?.assignee || task?.assigneeId);
const getProjectMemberIds = project => [...new Set([getId(project?.owner), ...(project?.members || []).map(getId)].filter(Boolean))];

const buildAnalysis = ({ project, tasks, users, currentUser }) => {
  if (!project) return null;
  const memberIds = getProjectMemberIds(project);
  const userMap = new Map(users.map(user => [getId(user), user]));
  if (currentUser) userMap.set(getId(currentUser), { ...userMap.get(getId(currentUser)), ...currentUser });
  const members = memberIds.map(id => ({ ...(project.members || []).find(member => getId(member) === id), ...(userMap.get(id) || {}), id })).filter(member => member.id);
  const projectId = getId(project);
  const projectTasks = tasks.filter(task => getId(task.projectId) === projectId);
  const allOpenTasks = tasks.filter(task => task.status !== 'done');
  const activeTasks = projectTasks.filter(task => task.status !== 'done');
  const completedTasks = projectTasks.filter(task => task.status === 'done');
  const now = today();

  const memberStats = members.map(member => {
    const id = member.id;
    const assigned = projectTasks.filter(task => getTaskAssigneeId(task) === id);
    const active = assigned.filter(task => task.status !== 'done');
    const allCurrent = allOpenTasks.filter(task => getTaskAssigneeId(task) === id);
    const completed = assigned.filter(task => task.status === 'done');
    const overdue = active.filter(task => { const due = parseDue(task); return due && due < now; });
    const hours = active.reduce((sum, task) => sum + estimatedHours(task) * priorityWeight(task.priority), 0);
    const allHours = allCurrent.reduce((sum, task) => sum + estimatedHours(task) * priorityWeight(task.priority), 0);
    const capacity = Math.max(1, Number(member.capacity ?? 40));
    const workload = Math.min(160, Math.round((hours / capacity) * 100));
    const status = workload >= 110 || overdue.length >= 3 ? 'Overloaded' : workload >= 85 ? 'Busy' : workload <= 25 ? 'Idle' : 'Balanced';
    const priorityCounts = active.reduce((acc, task) => ({ ...acc, [task.priority || 'medium']: (acc[task.priority || 'medium'] || 0) + 1 }), {});
    return { member, id, assigned, active, allCurrent, completed, overdue, hours: Math.round(hours), allHours: Math.round(allHours), capacity, workload, status, priorityCounts, availability: availabilityText(member), workingHours: workingHoursText(member) };
  });

  const totalCapacity = memberStats.reduce((sum, stat) => sum + stat.capacity, 0);
  const remainingHours = activeTasks.reduce((sum, task) => sum + estimatedHours(task) * priorityWeight(task.priority), 0);
  const averageLoad = memberStats.length ? memberStats.reduce((sum, stat) => sum + stat.workload, 0) / memberStats.length : 0;
  const spread = memberStats.length ? Math.max(...memberStats.map(stat => stat.workload)) - Math.min(...memberStats.map(stat => stat.workload)) : 0;
  const overdueCount = activeTasks.filter(task => daysUntil(task) < 0).length;
  const overloadedCount = memberStats.filter(stat => stat.status === 'Overloaded').length;
  const overloadedPercentage = memberStats.length ? overloadedCount / memberStats.length : 0;
  const capacityExcessPercent = totalCapacity ? Math.max(0, Math.round(((remainingHours - totalCapacity) / totalCapacity) * 100)) : 0;
  const allOverloaded = memberStats.length > 0 && overloadedCount === memberStats.length;
  const noAvailableMember = memberStats.length > 0 && !memberStats.some(stat => stat.workload < 85);
  const sprintImpossible = remainingHours > totalCapacity || allOverloaded || (overdueCount > 0 && averageLoad > 95);
  const overduePenalty = activeTasks.length ? (overdueCount / activeTasks.length) * 28 : 0;
  const capacityPenalty = capacityExcessPercent * 0.55;
  const overloadedPenalty = overloadedPercentage * 34;
  const balanceScore = Math.max(0, Math.min(100, Math.round(100 - spread * 0.3 - overduePenalty - capacityPenalty - overloadedPenalty - Math.max(0, averageLoad - 85) * 0.35)));
  const mostOverloaded = [...memberStats].sort((a, b) => b.workload - a.workload)[0];
  const leastUtilized = [...memberStats].sort((a, b) => a.workload - b.workload)[0];
  const highestRisk = [...activeTasks].sort((a, b) => (daysUntil(a) - daysUntil(b)) || priorityWeight(b.priority) - priorityWeight(a.priority))[0];

  const recommendations = [];
  const addSystemRecommendation = rec => {
    if (!rec?.title) return;
    const id = `${rec.type}-${recommendations.length}`;
    recommendations.push({ id, system: true, severity: 'High', ...rec });
  };
  const addRecommendation = rec => {
    if (!rec?.task || !rec?.to || !rec?.from || rec.from.id === rec.to.id) return;
    if (recommendations.some(item => getId(item.task) === getId(rec.task) && item.to?.id === rec.to.id)) return;
    recommendations.push({ id: `${rec.type}-${getId(rec.task)}-${rec.to.id}`, ...rec });
  };
  const backendHours = activeTasks.filter(task => taskKeywords(task).some(skill => ['Node.js', 'MongoDB', 'DevOps'].includes(skill))).reduce((sum, task) => sum + estimatedHours(task) * priorityWeight(task.priority), 0);
  const frontendHours = activeTasks.filter(task => taskKeywords(task).some(skill => ['React', 'Design'].includes(skill))).reduce((sum, task) => sum + estimatedHours(task) * priorityWeight(task.priority), 0);
  const lowPriorityHours = activeTasks.filter(task => task.priority === 'low').reduce((sum, task) => sum + estimatedHours(task), 0);
  const largeTasks = activeTasks.filter(task => estimatedHours(task) >= 10).sort((a, b) => estimatedHours(b) - estimatedHours(a));

  if (allOverloaded) {
    addSystemRecommendation({
      type: 'team-overloaded',
      title: 'Every team member is overloaded.',
      action: 'Consider adding 1-2 additional developers to reduce delivery risk.',
      why: `Average workload is ${Math.round(averageLoad)}%, and all ${memberStats.length} members are above safe capacity. Reassigning tasks would only move overload from one person to another.`,
      preview: `Current team capacity: ${Math.round(totalCapacity)}h. Remaining weighted workload: ${Math.round(remainingHours)}h.`,
      improvement: capacityExcessPercent > 0 ? `${capacityExcessPercent}% capacity gap` : `${Math.round(averageLoad)}% average workload`,
      deadlineImpact: 'Reduces delivery risk more than internal reassignment.',
      applyHint: 'Add team members, reduce sprint scope, or extend the timeline from your project planning flow.',
    });
  }

  if (capacityExcessPercent > 0) {
    addSystemRecommendation({
      type: 'capacity-exceeded',
      title: `Estimated workload exceeds available team capacity by ${capacityExcessPercent}%.`,
      action: 'Increase team size or extend the project timeline.',
      why: `${Math.round(remainingHours)}h of weighted work remains against ${Math.round(totalCapacity)}h of available capacity. This sprint is not realistically balanced with the current team.`,
      preview: lowPriorityHours > 0 ? `Delay up to ${Math.round(lowPriorityHours)}h of low-priority work or add capacity before the next sprint checkpoint.` : 'No low-priority buffer is available, so timeline or staffing changes are safer than reassignment.',
      improvement: `${capacityExcessPercent}% overload reduction needed`,
      deadlineImpact: sprintImpossible ? 'Current plan is at high deadline risk.' : 'Improves delivery confidence.',
      applyHint: 'Use this as a planning action: add capacity, extend the deadline, or reduce scope.',
    });
  }

  if (backendHours > totalCapacity * 0.45 && noAvailableMember) {
    addSystemRecommendation({
      type: 'backend-shortage',
      title: 'Backend workload exceeds available capacity.',
      action: 'Add another Backend Developer or temporarily reduce sprint scope.',
      why: `Backend/database/API work accounts for about ${Math.round(backendHours)}h, and no team member is currently below 85% workload.`,
      preview: 'Prioritize critical API/database tasks, then postpone non-critical backend work.',
      improvement: 'Reduces backend delivery bottleneck',
      deadlineImpact: 'Protects high-risk backend deadlines.',
      applyHint: 'Add a backend-capable member or move lower-priority backend work out of this sprint.',
    });
  }

  if (frontendHours > totalCapacity * 0.45 && noAvailableMember) {
    addSystemRecommendation({
      type: 'frontend-shortage',
      title: 'Frontend tasks exceed current capacity.',
      action: 'Add a Frontend Developer or postpone low-priority features.',
      why: `Frontend/UI work accounts for about ${Math.round(frontendHours)}h, while every current member is already busy or overloaded.`,
      preview: 'Keep user-facing critical paths first and defer low-priority UI polish or secondary screens.',
      improvement: 'Reduces frontend queue pressure',
      deadlineImpact: 'Lowers risk on visible product milestones.',
      applyHint: 'Add a frontend-capable member or reduce frontend scope for the sprint.',
    });
  }

  if (largeTasks.length && sprintImpossible) {
    addSystemRecommendation({
      type: 'split-large-task',
      title: 'Large tasks are increasing deadline risk.',
      action: `Split ${largeTasks[0].title} into smaller deliverables.`,
      why: `${largeTasks[0].title} is estimated at ${estimatedHours(largeTasks[0])}h. Smaller tasks are easier to parallelize, estimate, and move between specialists.`,
      preview: 'Break the task into design, implementation, review, and testing slices before assigning more work.',
      improvement: 'Improves scheduling accuracy',
      deadlineImpact: 'Reduces hidden remaining-work risk.',
      applyHint: 'Open the task and split it into smaller tracked tasks or subtasks.',
    });
  }

  const sortedBusy = [...memberStats].sort((a, b) => b.workload - a.workload);
  const sortedIdle = [...memberStats].sort((a, b) => a.workload - b.workload);

  if (noAvailableMember && !recommendations.length) {
    addSystemRecommendation({
      type: 'no-available-member',
      title: 'No available member can safely receive more work.',
      action: 'Reduce sprint scope, extend deadlines, or add temporary capacity.',
      why: `Every project member is at least 85% loaded, so reassignment cannot reduce overall risk.`,
      preview: `Average workload is ${Math.round(averageLoad)}% with ${Math.round(remainingHours)}h remaining.`,
      improvement: 'Requires planning-level capacity change',
      deadlineImpact: overdueCount > 0 ? `${overdueCount} overdue task${overdueCount === 1 ? '' : 's'} already need attention.` : 'Prevents new deadline risk from being created.',
      applyHint: 'Use project planning to add people, extend timeline, or defer low-priority tasks.',
    });
  }

  if (noAvailableMember) {
    return { projectTasks, activeTasks, completedTasks, memberStats, recommendations: recommendations.slice(0, 8), balanceScore, mostOverloaded, leastUtilized, highestRisk, totalCapacity, remainingHours, overloadedCount, capacityExcessPercent };
  }

  sortedBusy.forEach(from => {
    if (from.workload < 85 && from.overdue.length === 0) return;
    const movable = [...from.active].sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || estimatedHours(b) - estimatedHours(a));
    movable.slice(0, 3).forEach(task => {
      const candidate = sortedIdle.find(to => to.id !== from.id && to.workload < 85 && skillMatches(to.member, task).score >= skillMatches(from.member, task).score);
      if (!candidate) return;
      const improvement = Math.max(3, Math.round((from.workload - Math.max(0, from.workload - (estimatedHours(task) / from.capacity) * 100)) + ((85 - candidate.workload) * 0.08)));
      addRecommendation({ type: 'rebalance', severity: from.status === 'Overloaded' ? 'High' : 'Medium', title: `${displayName(from.member)} is ${from.status.toLowerCase()}.`, action: `Move ${task.title} to ${displayName(candidate.member)}.`, why: `${displayName(from.member)} is carrying ${from.workload}% workload with ${from.overdue.length} overdue task${from.overdue.length === 1 ? '' : 's'}, while ${displayName(candidate.member)} is at ${candidate.workload}% and has matching capacity.`, task, from, to: candidate, improvement, deadlineImpact: daysUntil(task) < 0 ? 'Reduces immediate overdue pressure' : daysUntil(task) <= 3 ? 'Improves a near-deadline task path' : 'Improves delivery confidence' });
    });
  });

  activeTasks.forEach(task => {
    const from = memberStats.find(stat => stat.id === getTaskAssigneeId(task));
    if (!from) return;
    const fromSkill = skillMatches(from.member, task);
    const better = memberStats.filter(stat => stat.id !== from.id && stat.workload < 100).map(stat => ({ stat, skill: skillMatches(stat.member, task) })).sort((a, b) => b.skill.score - a.skill.score || a.stat.workload - b.stat.workload)[0];
    if (!better || better.skill.score <= Math.max(1, fromSkill.score + 1)) return;
    addRecommendation({ type: 'skill-fit', severity: task.priority === 'critical' || task.priority === 'high' ? 'High' : 'Medium', title: `${task.title} has a stronger skill fit available.`, action: `Assign it to ${displayName(better.stat.member)}.`, why: `${displayName(better.stat.member)} matches ${better.skill.matches.slice(0, 2).join(', ') || 'the required skills'} better than the current assignee and is at ${better.stat.workload}% workload.`, task, from, to: better.stat, improvement: Math.max(5, better.skill.score * 4), deadlineImpact: daysUntil(task) <= 3 ? 'Better expertise lowers deadline risk' : 'Improves execution quality' });
  });

  activeTasks.filter(task => ['critical', 'high'].includes(task.priority)).forEach(task => {
    const from = memberStats.find(stat => stat.id === getTaskAssigneeId(task));
    if (!from) return;
    const fromSkill = skillMatches(from.member, task).score;
    const best = memberStats.filter(stat => stat.id !== from.id && stat.workload < 90).map(stat => ({ stat, score: skillMatches(stat.member, task).score + stat.completed.length * 0.15 })).sort((a, b) => b.score - a.score || a.stat.workload - b.stat.workload)[0];
    if (!best || best.score <= fromSkill + 0.5) return;
    addRecommendation({ type: 'priority-risk', severity: 'High', title: `${task.priority} priority task needs a safer owner.`, action: `Move ${task.title} to ${displayName(best.stat.member)}.`, why: `${displayName(best.stat.member)} has stronger skill/completion history and lower active load for a high-impact task.`, task, from, to: best.stat, improvement: 8 + Math.round(best.score * 2), deadlineImpact: daysUntil(task) <= 5 ? 'Meaningfully lowers deadline risk' : 'Protects a high-priority delivery item' });
  });

  return { projectTasks, activeTasks, completedTasks, memberStats, recommendations: recommendations.slice(0, 8), balanceScore, mostOverloaded, leastUtilized, highestRisk, totalCapacity, remainingHours, overloadedCount, capacityExcessPercent };
};

const AIWorkloadBalancer = () => {
  const { projects = [], tasks = [], users = [], currentUser, editTask, refreshData, dataLoading } = useApp();
  const [selectedProjectId, setSelectedProjectId] = useState(() => getId(projects[0]) || '');
  const [dismissed, setDismissed] = useState([]);
  const [previewId, setPreviewId] = useState('');
  const [applyingId, setApplyingId] = useState('');

  const project = useMemo(() => projects.find(item => getId(item) === selectedProjectId) || projects[0] || null, [projects, selectedProjectId]);
  const analysis = useMemo(() => buildAnalysis({ project, tasks, users, currentUser }), [project, tasks, users, currentUser]);
  const recommendations = (analysis?.recommendations || []).filter(rec => !dismissed.includes(rec.id));

  const applyRecommendation = async recommendation => {
    if (recommendation?.system) {
      toast.info(recommendation.applyHint || 'Use this recommendation during sprint planning.');
      return;
    }
    if (!recommendation?.task || !recommendation?.to) return;
    const ok = window.confirm(`Apply AI recommendation?\n\n${recommendation.task.title}\n${displayName(recommendation.from.member)} -> ${displayName(recommendation.to.member)}`);
    if (!ok) return;
    setApplyingId(recommendation.id);
    try {
      await editTask(getId(recommendation.task), { assigneeId: recommendation.to.id });
      setDismissed(prev => [...prev, recommendation.id]);
      toast.success('Task reassigned. Workspace data is refreshing.');
    } catch (error) {
      toast.error(error.message || 'Unable to apply recommendation.');
    } finally {
      setApplyingId('');
    }
  };

  if (!projects.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900"><Sparkles className="mx-auto h-8 w-8 text-violet-500" /><h1 className="mt-3 text-xl font-black text-slate-950 dark:text-white">AI Workload Balancer</h1><p className="mt-2 text-sm font-semibold text-slate-400">Create a project with team members and tasks to start workload balancing.</p></div>;
  }

  const healthTone = analysis?.balanceScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : analysis?.balanceScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

  return <div className="space-y-5 text-left">
    <section className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-600 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-300"><BrainCircuit className="h-3.5 w-3.5" />AI Project Manager</div>
          <h1 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">AI Workload Balancer</h1>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">Continuously analyzes skills, proficiency, workload, due dates, estimated hours, availability, and completion history to recommend better task distribution.</p>
        </div>
        <div className="w-full max-w-sm space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Project Selector</span>
          <TaskPilotSelect portal value={getId(project)} onChange={value => { setSelectedProjectId(value); setDismissed([]); setPreviewId(''); }} options={projects.map(item => [getId(item), item.name])} />
        </div>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-4">
      <HealthCard icon={Gauge} label="Balance Score" value={`${analysis?.balanceScore || 0}%`} detail={(analysis?.balanceScore || 0) >= 80 ? 'Balanced' : 'Unbalanced'} tone={healthTone} />
      <HealthCard icon={ShieldAlert} label="Most Overloaded" value={displayName(analysis?.mostOverloaded?.member)} detail={`${analysis?.mostOverloaded?.workload || 0}% workload`} tone="text-rose-600 dark:text-rose-400" />
      <HealthCard icon={UserCheck} label="Least Utilized" value={displayName(analysis?.leastUtilized?.member)} detail={`${analysis?.leastUtilized?.workload || 0}% workload`} tone="text-sky-600 dark:text-sky-400" />
      <HealthCard icon={Clock} label="Highest Risk Deadline" value={analysis?.highestRisk?.title || 'No active risk'} detail={analysis?.highestRisk ? `${Math.max(daysUntil(analysis.highestRisk), 0)} day(s) left` : 'All clear'} tone="text-amber-600 dark:text-amber-400" />
    </section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Panel title="Current Team Overview" icon={Users} right={`${analysis?.memberStats?.length || 0} members`}>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {(analysis?.memberStats || []).map(stat => <MemberCard key={stat.id} stat={stat} />)}
          </div>
        </Panel>

        <Panel title="Workload Distribution" icon={Gauge} right={`${analysis?.activeTasks?.length || 0} active tasks`}>
          <div className="space-y-4">
            {(analysis?.memberStats || []).map(stat => <WorkloadRow key={stat.id} stat={stat} />)}
          </div>
        </Panel>
      </div>

      <Panel title="AI Recommendations" icon={Lightbulb} right={dataLoading ? 'Refreshing' : `${recommendations.length} open`}>
        <div className="space-y-3">
          <button type="button" onClick={refreshData} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"><RefreshCw className="h-3.5 w-3.5" />Refresh Analysis</button>
          {recommendations.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center dark:border-slate-800"><CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" /><p className="mt-2 text-sm font-black text-slate-800 dark:text-slate-100">No urgent rebalancing needed</p><p className="mt-1 text-xs font-semibold text-slate-400">The current distribution looks healthy for this project.</p></div> : recommendations.map(rec => <RecommendationCard key={rec.id} recommendation={rec} previewOpen={previewId === rec.id} applying={applyingId === rec.id} onPreview={() => setPreviewId(previewId === rec.id ? '' : rec.id)} onApply={() => applyRecommendation(rec)} onDismiss={() => setDismissed(prev => [...prev, rec.id])} />)}
        </div>
      </Panel>
    </section>
  </div>;
};

const HealthCard = ({ icon: Icon, label, value, detail, tone }) => <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><Icon className={`h-5 w-5 ${tone}`} /><p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-xs font-bold text-slate-400">{detail}</p></div>;
const Panel = ({ title, icon: Icon, right, children }) => <section className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-500" /><h2 className="text-sm font-black text-slate-950 dark:text-white">{title}</h2></div>{right && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">{right}</span>}</div>{children}</section>;
const MemberCard = ({ stat }) => <article className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Avatar name={displayName(stat.member)} avatar={stat.member.avatar} className="h-10 w-10 text-[11px]" /><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-900 dark:text-white">{displayName(stat.member)}</h3><p className="truncate text-xs font-semibold text-slate-400">{stat.member.title || stat.member.role || 'Project Member'}</p></div></div><span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusTone(stat.status)}`}>{stat.status}</span></div><div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-2 rounded-full ${stat.workload >= 110 ? 'bg-rose-500' : stat.workload >= 85 ? 'bg-amber-500' : stat.workload <= 25 ? 'bg-sky-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, stat.workload)}%` }} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><MiniStat label="Workload" value={`${stat.workload}%`} /><MiniStat label="Tasks" value={stat.active.length} /><MiniStat label="Hours" value={stat.hours} /></div><div className="mt-3 flex flex-wrap gap-1.5">{(stat.member.skills || []).slice(0, 4).map(skill => <span key={skill.name} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{skill.name}</span>)}{!(stat.member.skills || []).length && <span className="text-[10px] font-bold text-slate-400">No skills added</span>}</div><div className="mt-3 grid gap-1.5 text-[11px] font-semibold text-slate-400"><span>Overdue: {stat.overdue.length}</span><span>Availability: {stat.availability}</span><span>Working hours: {stat.workingHours}</span></div></article>;
const MiniStat = ({ label, value }) => <div className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-950/60"><p className="text-xs font-black text-slate-900 dark:text-white">{value}</p><p className="text-[9px] font-black uppercase text-slate-400">{label}</p></div>;
const WorkloadRow = ({ stat }) => <div><div className="mb-2 flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900 dark:text-white">{displayName(stat.member)}</p><p className="text-[11px] font-semibold text-slate-400">{stat.active.length} tasks / {stat.hours}h remaining</p></div><span className="text-sm font-black text-slate-900 dark:text-white">{stat.workload}%</span></div><div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-2.5 rounded-full ${stat.workload >= 110 ? 'bg-rose-500' : stat.workload >= 85 ? 'bg-amber-500' : stat.workload <= 25 ? 'bg-sky-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, stat.workload)}%` }} /></div><div className="mt-2 flex flex-wrap gap-1.5">{['critical', 'high', 'medium', 'low'].map(priority => stat.priorityCounts[priority] ? <span key={priority} className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${priorityTone(priority)}`}>{priority}: {stat.priorityCounts[priority]}</span> : null)}</div></div>;
const RecommendationCard = ({ recommendation, previewOpen, applying, onPreview, onApply, onDismiss }) => <article className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${recommendation.severity === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/25 dark:text-rose-300 dark:border-rose-900/40' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-900/40'}`}>{recommendation.severity}</span><h3 className="mt-2 text-sm font-black text-slate-900 dark:text-white">{recommendation.title}</h3></div><button type="button" onClick={onDismiss} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div><p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">{recommendation.action}</p><p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400">{recommendation.why}</p><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={onPreview} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Preview</button><button type="button" disabled={applying} onClick={onApply} className="rounded-lg bg-violet-600 px-2 py-2 text-xs font-black text-white disabled:opacity-60">{recommendation.system ? 'Plan' : applying ? 'Applying' : 'Apply'}</button><button type="button" onClick={onDismiss} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-black text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800">Dismiss</button></div>{previewOpen && <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Preview</p>{recommendation.system ? <div className="mt-2 grid gap-1.5 text-[11px] font-semibold text-slate-400"><span>{recommendation.preview}</span><span>Estimated improvement: {recommendation.improvement}</span><span>Deadline impact: {recommendation.deadlineImpact}</span></div> : <><div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-300"><span className="truncate">{displayName(recommendation.from.member)}</span><ArrowDown className="h-4 w-4 shrink-0 text-violet-500" /><span className="truncate text-right">{displayName(recommendation.to.member)}</span></div><div className="mt-3 grid gap-1.5 text-[11px] font-semibold text-slate-400"><span>Task: {recommendation.task.title}</span><span>Estimated improvement: +{recommendation.improvement}% balance</span><span>Deadline impact: {recommendation.deadlineImpact}</span></div></>}</div>}</article>;

export default AIWorkloadBalancer;






