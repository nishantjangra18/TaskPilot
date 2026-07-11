import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, AlertCircle, Calendar, Check, CheckCircle, ChevronLeft, Clock, GitBranch, GripVertical, Inbox, Kanban, List, MessageCircle, MessageSquare,
  Paperclip, Plus, Search, Settings, Trash2, UserMinus, UserPlus, Users, Video, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { TaskPilotDatePicker, TaskPilotSelect, TaskPilotTimePicker } from '../components/TaskPilotControls';
import { getProjectIcon } from '../utils/iconHelper';
import { getProjectTheme } from '../utils/projectTheme';
import { analyzeProjectDependencies, dependencyFilterOptions, filterDependencyTasks, getAcceptedDependencies, getTaskId } from '../services/smartDependencyManager';

const iconOptions = ['folder', 'rocket', 'laptop', 'smartphone', 'zap', 'target', 'barchart', 'gamepad', 'shoppingcart', 'palette', 'filetext', 'microscope', 'construction', 'globe', 'package', 'testtube', 'graduationcap', 'megaphone', 'sparkles', 'shield'];
const statusOptions = [['todo', 'To Do'], ['in_progress', 'In Progress'], ['review', 'Review'], ['done', 'Done']];
const priorityOptions = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];
const taskTypeOptions = [['feature', 'Feature'], ['bug', 'Bug'], ['improvement', 'Improvement'], ['research', 'Research'], ['documentation', 'Documentation']];
const meetingTypeOptions = [['video', 'Video'], ['audio', 'Audio'], ['planning', 'Planning'], ['review', 'Review'], ['standup', 'Standup'], ['other', 'Other']];
const recurrenceOptions = [['none', 'None'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
const today = () => new Date().toISOString().split('T')[0];
const nativeInputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-hidden transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-violet-950";
const actionButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm";
const NativeSelect = (props) => <TaskPilotSelect {...props} />;
const NativeDateInput = (props) => <TaskPilotDatePicker {...props} />;
const NativeTimeInput = (props) => <TaskPilotTimePicker {...props} />;
const iconLabel = value => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^[a-z]/, char => char.toUpperCase()).replace('Barchart', 'Bar Chart').replace('Filetext', 'File Text').replace('Shoppingcart', 'Shopping Cart').replace('Testtube', 'Flask').replace('Graduationcap', 'Graduation Cap');
const renderIconOption = option => <><span className="flex h-5 w-5 shrink-0 items-center justify-center">{getProjectIcon(option.value, { className: 'h-4 w-4' })}</span><span className="truncate">{option.label}</span></>;

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    projects, tasks, users, currentUser, activityLogs, addTask, editTask, deleteTask, editProject, deleteProject,
    addMemberToProject, removeMemberFromProject, searchUsersByEmail, sendInvitation,
    activeMeetings, meetings, startProjectMeeting, joinProjectMeeting,
    startScheduledMeeting, scheduleProjectMeeting, updateProjectMeeting, cancelProjectMeeting,
  } = useApp();

  const project = projects.find(p => (p._id || p.id) === id);
  const [viewMode, setViewMode] = useState('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dependencyFilter, setDependencyFilter] = useState('all');
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStartMeetingModal, setShowStartMeetingModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState('');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskStatus, setTaskStatus] = useState('todo');
  const [taskDueDate, setTaskDueDate] = useState(today());
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskType, setTaskType] = useState('feature');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  const [settingsName, setSettingsName] = useState(project?.name || '');
  const [settingsDesc, setSettingsDesc] = useState(project?.description || '');
  const [settingsIcon, setSettingsIcon] = useState(project?.icon || 'folder');
  const [settingsTheme, setSettingsTheme] = useState(project?.theme || project?.color || '#8b5cf6');

  const [startMeetingForm, setStartMeetingForm] = useState({ title: '', description: '' });
  const [meetingForm, setMeetingForm] = useState({ title: '', description: '', date: today(), startTime: '10:00', endTime: '10:30', participants: [], meetingType: 'video', recurrence: 'none' });

  if (!project) {
    return <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 my-8"><AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">Project Not Found</h2><Link to="/projects" className="mt-6 inline-flex items-center text-violet-600 font-semibold text-sm"><ChevronLeft className="h-4 w-4 mr-1" /> Back to projects</Link></div>;
  }

  const projectId = project._id || project.id;
  const ownerId = project.owner?._id || project.owner || project.ownerId;
  const isCurrentOwner = String(ownerId) === String(currentUser?.id);
  const isCurrentMember = (project.members || []).some(member => String(member._id || member) === String(currentUser?.id));
  const hasAccess = isCurrentOwner || isCurrentMember;
  const theme = getProjectTheme(project.theme || project.color || '#8b5cf6');
  const ownerUser = users.find(user => String(user._id || user.id) === String(ownerId));
  const memberUsers = (project.members || []).map(member => typeof member === 'object' ? member : users.find(user => String(user._id || user.id) === String(member))).filter(Boolean).filter(user => String(user._id || user.id) !== String(ownerId));
  const projectUsers = [ownerUser, ...memberUsers].filter(Boolean);
  const projectUserIds = projectUsers.map(user => user._id || user.id);

  const projectTasks = tasks.filter(task => String(task.projectId?._id || task.projectId) === String(projectId));
  const filteredTasks = projectTasks.filter(task => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || `${task.title || ''} ${task.description || ''}`.toLowerCase().includes(query);
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });
  const dependencyAnalysis = useMemo(() => analyzeProjectDependencies(projectTasks), [projectTasks]);
  const dependencyTasks = filterDependencyTasks(dependencyAnalysis, dependencyFilter);
  const projectMeetings = (meetings || []).filter(meeting => String(meeting.projectId?._id || meeting.projectId) === String(projectId)).filter(meeting => !['completed', 'ended'].includes(meeting.status));
  const activeMeeting = (activeMeetings || []).find(meeting => String(meeting.projectId?._id || meeting.projectId) === String(projectId) && ['live', 'active'].includes(meeting.status));
  const totalCount = projectTasks.length;
  const completedCount = projectTasks.filter(task => task.status === 'done').length;
  const inProgressCount = projectTasks.filter(task => task.status === 'in_progress').length;
  const reviewCount = projectTasks.filter(task => task.status === 'review').length;
  const overdueCount = projectTasks.filter(task => {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(`${task.dueDate}T${task.dueTime || '23:59'}`) < new Date();
  }).length;
  const completionRate = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const overviewCards = [
    { label: 'Progress Metric', value: `${completionRate}%`, subtitle: `${completedCount}/${totalCount} complete`, icon: CheckCircle, tone: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/25 border-violet-100 dark:border-violet-900/40' },
    { label: 'Total Tasks', value: totalCount, subtitle: 'All tasks combined', icon: List, tone: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/25 border-blue-100 dark:border-blue-900/40' },
    { label: 'In Progress', value: inProgressCount, subtitle: 'Active development', icon: Clock, tone: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/25 border-violet-100 dark:border-violet-900/40' },
    { label: 'Pending Review', value: reviewCount, subtitle: 'Awaiting QA confirmation', icon: Search, tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/25 border-amber-100 dark:border-amber-900/40' },
    { label: 'Overdue Tasks', value: overdueCount, subtitle: 'Missed deadlines', icon: AlertCircle, tone: `${overdueCount > 0 ? 'border-rose-300 dark:border-rose-800/70' : 'border-rose-100 dark:border-rose-900/40'} text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/25` },
    { label: 'Team Members', value: projectUsers.length, subtitle: 'Total collaborators', icon: Users, tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/25 border-emerald-100 dark:border-emerald-900/40' },
  ];

  const inviteMatches = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (query.length < 5 || !query.includes('@')) return [];
    return users.filter(user => {
      const userId = user._id || user.id;
      return userId !== currentUser?.id && !projectUserIds.includes(userId) && (user.email || '').toLowerCase().startsWith(query);
    }).slice(0, 3);
  }, [memberSearch, users, currentUser, projectUserIds]);

  if (!hasAccess && currentUser) {
    return <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 my-8"><AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2><p className="text-sm mt-1">You are not a member of this project workspace.</p><Link to="/projects" className="mt-6 inline-flex items-center text-violet-600 font-semibold text-sm"><ChevronLeft className="h-4 w-4 mr-1" /> Back to projects</Link></div>;
  }

  const resetTaskForm = () => {
    setTaskTitle(''); setTaskDesc(''); setTaskPriority('medium'); setTaskStatus('todo'); setTaskDueDate(today()); setTaskDueTime(''); setTaskType('feature'); setTaskAssigneeId('');
  };
  const submitTask = async (event) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    await addTask(projectId, { title: taskTitle.trim(), description: taskDesc.trim(), priority: taskPriority, status: taskStatus, dueDate: taskDueDate, dueTime: taskDueTime || '23:59', type: taskType, assigneeId: taskAssigneeId || null });
    resetTaskForm();
    setShowAddModal(false);
  };
  const removeTask = async (taskId, title) => {
    if (confirm(`Delete "${title || 'this task'}"?`)) await deleteTask(taskId);
  };
  const saveSettings = async (event) => {
    event.preventDefault();
    await editProject(projectId, { name: settingsName.trim(), description: settingsDesc.trim(), icon: settingsIcon, theme: settingsTheme, color: settingsTheme });
    setShowSettingsModal(false);
  };
  const removeProject = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await deleteProject(projectId);
    navigate('/projects');
  };
  const addMember = async (userId) => {
    await addMemberToProject(projectId, userId);
    setMemberSearch('');
  };
  const inviteByEmail = async () => {
    const email = memberSearch.trim();
    if (!email.includes('@')) return;
    const found = await searchUsersByEmail(email);
    if (found?.length) await addMember(found[0]._id || found[0].id);
    else if (sendInvitation) {
      await sendInvitation(projectId, email);
      setInviteFeedback(`Invitation sent to ${email}.`);
    }
    setMemberSearch('');
  };
  const openStartMeetingModal = () => {
    setStartMeetingForm({ title: `${project.name} Meeting`, description: '' });
    setShowStartMeetingModal(true);
  };
  const startMeeting = async (event) => {
    event.preventDefault();
    if (!startMeetingForm.title.trim() || busy) return;
    setBusy(true);
    try {
      const meeting = await startProjectMeeting(projectId, { title: startMeetingForm.title.trim(), description: startMeetingForm.description.trim() });
      if (meeting) navigate(`/projects/${projectId}/meeting`);
    } finally { setBusy(false); }
  };
  const joinMeeting = async (meeting = activeMeeting) => {
    if (!meeting?._id) return;
    await joinProjectMeeting(meeting._id);
    navigate(`/projects/${projectId}/meeting`);
  };
  const openScheduleMeetingModal = (meeting = null) => {
    setEditingMeeting(meeting);
    setMeetingForm(meeting ? { title: meeting.title || '', description: meeting.description || '', date: meeting.scheduledDate || today(), startTime: meeting.startTime || '10:00', endTime: meeting.endTime || '10:30', participants: (meeting.scheduledParticipants || []).map(user => user._id || user.id || user), meetingType: meeting.meetingType || 'video', recurrence: meeting.recurrence || 'none' } : { title: '', description: '', date: today(), startTime: '10:00', endTime: '10:30', participants: projectUserIds, meetingType: 'video', recurrence: 'none' });
    setShowScheduleModal(true);
  };
  const saveMeeting = async (event) => {
    event.preventDefault();
    if (!meetingForm.title.trim() || meetingForm.endTime <= meetingForm.startTime) return;
    const payload = { ...meetingForm, title: meetingForm.title.trim(), participants: meetingForm.participants.length ? meetingForm.participants : projectUserIds };
    if (editingMeeting) await updateProjectMeeting(editingMeeting._id || editingMeeting.id, payload);
    else await scheduleProjectMeeting(projectId, payload);
    setShowScheduleModal(false);
  };
  const handleTaskDragStart = (event, taskId) => {
    setDraggingTaskId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(taskId));
  };
  const handleTaskDragEnd = () => setDraggingTaskId(null);
  const handleColumnDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  const handleColumnDrop = async (event, status) => {
    event.preventDefault();
    const droppedTaskId = event.dataTransfer.getData('text/plain') || draggingTaskId;
    setDraggingTaskId(null);
    if (!droppedTaskId) return;
    const droppedTask = projectTasks.find(task => String(task._id || task.id) === String(droppedTaskId));
    if (!droppedTask || (droppedTask.status || 'todo') === status) return;
    await editTask(droppedTaskId, { status });
  };

  const statusColumns = [
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Done' },
  ];
  const taskCard = (task) => {
    const taskId = task._id || task.id;
    const assigneeId = task.assignee?._id || task.assignee || task.assigneeId;
    const assignee = typeof task.assignee === 'object' ? task.assignee : users.find(user => String(user._id || user.id) === String(assigneeId));
    const commentsCount = task.comments?.length || 0;
    const attachmentsCount = task.attachments?.length || 0;
    const activityCount = (activityLogs || []).filter(log => String(log.taskId?._id || log.taskId) === String(taskId)).length;
    const isOverdue = Boolean(task.dueDate && task.status !== 'done' && new Date(`${task.dueDate}T${task.dueTime || '23:59'}`) < new Date());
    const dueLabel = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
    return (
      <div key={taskId} draggable onDragStart={(event) => handleTaskDragStart(event, taskId)} onDragEnd={handleTaskDragEnd} onClick={() => navigate(`/projects/${projectId}/tasks/${taskId}`)} style={isOverdue ? { borderLeft: '4px solid #ef4444', boxShadow: '0 0 0 1px rgba(239,68,68,.30), 0 0 16px rgba(239,68,68,.08)' } : undefined} className={`group cursor-grab rounded-2xl border bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:cursor-grabbing dark:bg-slate-900 ${isOverdue ? 'border-rose-200/80 hover:border-rose-300 hover:shadow-rose-500/10 dark:border-rose-900/50 dark:hover:border-rose-800/70' : 'border-slate-100 hover:border-violet-200 dark:border-slate-800 dark:hover:border-violet-900/60'}`}>        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{task.title}</h3>
              <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-400 dark:text-slate-500">{task.description || 'No description'}</p>
            </div>
          </div>
          {isCurrentOwner && <button type="button" onClick={(e) => { e.stopPropagation(); removeTask(taskId, task.title); }} className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-600 hover:text-white"><Trash2 className="h-4 w-4" /></button>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
          <span className="rounded-lg border border-slate-100 px-2.5 py-1 dark:border-slate-800">{task.priority || 'medium'}</span>
          <span className="rounded-lg border border-slate-100 px-2.5 py-1 dark:border-slate-800">{task.type || 'feature'}</span>
          {isOverdue && <span className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-600 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-300">Overdue</span>}
        </div>

        {(dueLabel || assignee) && <div className="mt-4 space-y-3">
          {dueLabel && <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${isOverdue ? 'border-rose-200 text-rose-600 dark:border-rose-900/70 dark:text-rose-300' : 'border-slate-100 text-slate-400 dark:border-slate-800'}`}><Calendar className="h-3.5 w-3.5" />{dueLabel}</div>}
          {assignee && <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><Avatar name={assignee.name} avatar={assignee.avatar} className="h-7 w-7 text-[9px]" /><span className="truncate">{assignee.name}</span></div>}
        </div>}

        <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" />{commentsCount}</span>
          <span className="inline-flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" />{attachmentsCount}</span>
          {activityCount > 0 && <span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" />{activityCount}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">{getProjectIcon(project.icon, { className: 'h-8 w-8' })}</span>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="truncate text-2xl font-extrabold text-slate-900 dark:text-white">{project.name}</h1>{activeMeeting && <span className="rounded-full border border-emerald-900/40 bg-emerald-950/20 px-2 py-1 text-[10px] font-black uppercase text-emerald-400">Meeting Live</span>}</div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 dark:text-slate-500">{project.description || 'No project description yet.'}</p><div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400"><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{projectUsers.length} members</span><span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />{projectTasks.filter(task => task.status === 'done').length}/{projectTasks.length} complete</span></div></div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => navigate('/messages')} className={`${actionButtonClass} border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800`}><MessageSquare className="h-4 w-4" />Chat</button>
            <button type="button" onClick={() => setShowMembersModal(true)} className={`${actionButtonClass} border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800`}><Users className="h-4 w-4" />Members</button>
            {isCurrentOwner && <button type="button" onClick={() => setShowSettingsModal(true)} className={`${actionButtonClass} border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800`}><Settings className="h-4 w-4" />Settings</button>}
            {activeMeeting ? <button type="button" onClick={() => joinMeeting(activeMeeting)} className={`${actionButtonClass} bg-violet-600 text-white hover:bg-violet-700`}><Video className="h-4 w-4" />Join Meeting</button> : <button type="button" onClick={openStartMeetingModal} className={`${actionButtonClass} bg-violet-600 text-white hover:bg-violet-700`}><Video className="h-4 w-4" />Start Meeting</button>}
            {isCurrentOwner && <button type="button" onClick={() => openScheduleMeetingModal()} className={`${actionButtonClass} border border-violet-900/40 bg-violet-950/20 text-violet-300 hover:bg-violet-900/30`}><Calendar className="h-4 w-4" />Schedule</button>}
            <button type="button" onClick={() => setShowAddModal(true)} className={`${actionButtonClass} text-white ${theme.btnBg}`}><Plus className="h-4 w-4" />Task</button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {overviewCards.map(({ label, value, subtitle, icon: Icon, tone }) => (
          <div key={label} className={`rounded-2xl border bg-white p-4 shadow-xs dark:bg-slate-900 ${tone}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-wider opacity-80">{label}</p>
                <p className="mt-2 text-2xl font-extrabold leading-none text-slate-900 dark:text-white">{value}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-950/50">
                <Icon className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-3 truncate text-[11px] font-semibold text-slate-400 dark:text-slate-500">{subtitle}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 outline-hidden transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
        </div>
        <NativeSelect value={priorityFilter} onChange={setPriorityFilter} options={[["all", "Priority: All"], ["high", "High Priority"], ["medium", "Medium Priority"], ["low", "Low Priority"]]} className="w-full md:w-[180px] md:flex-none" />
        <div className="flex h-10 shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950 md:ml-auto"><button type="button" onClick={() => setViewMode('board')} className={`flex h-8 w-10 items-center justify-center rounded-lg transition-all duration-200 ${viewMode === 'board' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:bg-white hover:text-violet-500 dark:hover:bg-slate-900 dark:hover:text-violet-300'}`} title="Board"><Kanban className="h-4 w-4" /></button><button type="button" onClick={() => setViewMode('list')} className={`flex h-8 w-10 items-center justify-center rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:bg-white hover:text-violet-500 dark:hover:bg-slate-900 dark:hover:text-violet-300'}`} title="List"><List className="h-4 w-4" /></button></div>
      </div>

      <DependencyGraphPanel analysis={dependencyAnalysis} visibleTasks={dependencyTasks} filter={dependencyFilter} setFilter={setDependencyFilter} users={users} onOpenTask={(taskId) => navigate(`/projects/${projectId}/tasks/${taskId}`)} />

      {projectMeetings.length > 0 && <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Project Meetings</h2><span className="text-[10px] font-bold text-slate-500">{projectMeetings.length} total</span></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{projectMeetings.slice(0, 6).map(meeting => <div key={meeting._id || meeting.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40"><p className="truncate text-xs font-extrabold text-slate-900 dark:text-white">{meeting.title || `${project.name} Meeting`}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{meeting.scheduledDate || 'Live'} {meeting.startTime ? `${meeting.startTime} - ${meeting.endTime}` : ''}</p><div className="mt-2 flex gap-2">{isCurrentOwner && !['live', 'active'].includes(meeting.status) && <button type="button" onClick={() => startScheduledMeeting(meeting._id || meeting.id).then(() => navigate(`/projects/${projectId}/meeting`))} className="rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-bold text-white">Start</button>}{['live', 'active'].includes(meeting.status) && <button type="button" onClick={() => joinMeeting(meeting)} className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">Join</button>}{isCurrentOwner && <button type="button" onClick={() => openScheduleMeetingModal(meeting)} className="rounded-lg border border-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">Edit</button>}{isCurrentOwner && <button type="button" onClick={() => cancelProjectMeeting(meeting._id || meeting.id)} className="rounded-lg border border-rose-900/50 px-2 py-1 text-[10px] font-bold text-rose-400">Cancel</button>}</div></div>)}</div></div>}

      {viewMode === 'board' ? <div className="grid gap-6 xl:grid-cols-4 2xl:gap-7">{statusColumns.map(column => { const columnTasks = filteredTasks.filter(task => (task.status || 'todo') === column.key); return <section key={column.key} onDragOver={handleColumnDragOver} onDrop={(event) => handleColumnDrop(event, column.key)} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 shadow-xs dark:border-slate-800 dark:bg-slate-950/35"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">{column.label}</h2><span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-200 px-2.5 text-[10px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{columnTasks.length}</span></div><div className="space-y-5">{columnTasks.map(taskCard)}{columnTasks.length === 0 && <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center text-xs font-bold text-slate-400 dark:border-slate-800"><Inbox className="h-5 w-5 text-slate-300 dark:text-slate-700" /><span>No tasks in this stage</span></div>}</div></section>; })}</div> : <div className="space-y-4">{filteredTasks.map(taskCard)}{filteredTasks.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm font-bold text-slate-400 dark:border-slate-800">No tasks found.</div>}</div>}

      {showAddModal && <Modal title="Create Task" onClose={() => setShowAddModal(false)}><form onSubmit={submitTask} className="space-y-4"><Field label="Task Title"><input required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={`${nativeInputClass}`} placeholder="Task title" /></Field><Field label="Description"><textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} className={`${nativeInputClass} h-24 resize-none`} placeholder="Task details" /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="Type"><NativeSelect value={taskType} onChange={setTaskType} options={taskTypeOptions} /></Field><Field label="Priority"><NativeSelect value={taskPriority} onChange={setTaskPriority} options={priorityOptions} /></Field><Field label="Status"><NativeSelect value={taskStatus} onChange={setTaskStatus} options={statusOptions} /></Field><Field label="Assignee"><NativeSelect value={taskAssigneeId} onChange={setTaskAssigneeId} options={[["", "Unassigned"], ...projectUsers.map(user => [user._id || user.id, user.name])]} /></Field><Field label="Due Date"><NativeDateInput required value={taskDueDate} onChange={setTaskDueDate} /></Field><Field label="Due Time"><NativeTimeInput value={taskDueTime} onChange={setTaskDueTime} /></Field></div><ModalActions onCancel={() => setShowAddModal(false)} submitLabel="Create Task" disabled={!taskTitle.trim()} /></form></Modal>}

      {showMembersModal && <Modal title="Project Members" onClose={() => setShowMembersModal(false)}><div className="space-y-4"><div className="space-y-2">{projectUsers.map(user => { const userId = user._id || user.id; const role = String(userId) === String(ownerId) ? 'Owner' : 'Member'; return <div key={userId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-950/40"><div className="flex min-w-0 items-center gap-3"><Avatar name={user.name} avatar={user.avatar} className="h-9 w-9 text-[11px]" /><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900 dark:text-white">{user.name}</p><p className="truncate text-[10px] text-slate-400">{user.email}</p></div></div><div className="flex items-center gap-2"><span className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-black uppercase text-slate-500 dark:border-slate-800">{role}</span>{isCurrentOwner && role !== 'Owner' && <button type="button" onClick={() => removeMemberFromProject(projectId, userId)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-600 hover:text-white"><UserMinus className="h-4 w-4" /></button>}</div></div>; })}</div>{isCurrentOwner && <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"><Field label="Invite or add by email"><div className="flex gap-2"><input value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); setInviteFeedback(''); }} className={`${nativeInputClass}`} placeholder="teammate@example.com" /><button type="button" onClick={inviteByEmail} className="rounded-xl bg-violet-600 px-3 text-xs font-bold text-white"><UserPlus className="h-4 w-4" /></button></div></Field>{inviteFeedback && <p className="mt-2 text-xs font-semibold text-violet-300">{inviteFeedback}</p>}{memberSearch.trim().length >= 5 && <div className="mt-2 space-y-1">{inviteMatches.length ? inviteMatches.map(user => <button key={user._id || user.id} type="button" onClick={() => addMember(user._id || user.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-slate-300 hover:bg-violet-950/40"><Avatar name={user.name} avatar={user.avatar} className="h-7 w-7 text-[9px]" />{user.name}<span className="ml-auto text-[10px] text-slate-500">{user.email}</span></button>) : <div className="rounded-lg border border-dashed border-slate-800 p-2 text-xs text-slate-400">No matching user found. Use invite to send an email invitation.</div>}</div>}</div>}</div></Modal>}

      {showSettingsModal && isCurrentOwner && <Modal title="Project Workspace Settings" onClose={() => setShowSettingsModal(false)}><form onSubmit={saveSettings} className="space-y-4"><Field label="Icon"><NativeSelect value={settingsIcon} onChange={setSettingsIcon} options={iconOptions.map(opt => [opt, iconLabel(opt)])} renderValue={renderIconOption} renderOption={renderIconOption} /></Field><Field label="Project Name"><input required value={settingsName} onChange={(e) => setSettingsName(e.target.value)} className={`${nativeInputClass}`} /></Field><Field label="Description"><textarea value={settingsDesc} onChange={(e) => setSettingsDesc(e.target.value)} className={`${nativeInputClass} h-24 resize-none`} /></Field><Field label="Accent"><div className="flex flex-wrap gap-2">{['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'].map(color => <button key={color} type="button" onClick={() => setSettingsTheme(color)} className={`h-8 w-8 rounded-xl border-2 transition-all ${settingsTheme === color ? 'border-white scale-105' : 'border-slate-800'}`} style={{ backgroundColor: color }} />)}</div></Field><div className="flex justify-between gap-3 pt-2"><button type="button" onClick={removeProject} className="inline-flex items-center gap-2 rounded-xl border border-rose-900/50 px-4 py-2 text-xs font-bold text-rose-400 transition-colors hover:bg-rose-600 hover:text-white"><Trash2 className="h-4 w-4" />Delete Project</button><ModalActions onCancel={() => setShowSettingsModal(false)} submitLabel="Save Settings" /></div></form></Modal>}

      {showStartMeetingModal && <Modal title="Start New Meeting" onClose={() => setShowStartMeetingModal(false)}><form onSubmit={startMeeting} className="space-y-4"><Field label="Meeting Title"><input required value={startMeetingForm.title} onChange={(e) => setStartMeetingForm(prev => ({ ...prev, title: e.target.value }))} className={`${nativeInputClass}`} /></Field><Field label="Optional Description"><textarea value={startMeetingForm.description} onChange={(e) => setStartMeetingForm(prev => ({ ...prev, description: e.target.value }))} className={`${nativeInputClass} h-24 resize-none`} /></Field><ModalActions onCancel={() => setShowStartMeetingModal(false)} submitLabel={busy ? 'Starting...' : 'Start Meeting'} disabled={!startMeetingForm.title.trim() || busy} /></form></Modal>}

      {showScheduleModal && <Modal title={editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'} onClose={() => setShowScheduleModal(false)} wide><form onSubmit={saveMeeting} className="space-y-4"><Field label="Meeting Title"><input required value={meetingForm.title} onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))} className={`${nativeInputClass}`} /></Field><Field label="Description"><textarea value={meetingForm.description} onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))} className={`${nativeInputClass} h-20 resize-none`} /></Field><div className="grid gap-4 md:grid-cols-3"><Field label="Date"><NativeDateInput required value={meetingForm.date} onChange={(date) => setMeetingForm(prev => ({ ...prev, date }))} /></Field><Field label="Start Time"><NativeTimeInput required value={meetingForm.startTime} onChange={(startTime) => setMeetingForm(prev => ({ ...prev, startTime }))} /></Field><Field label="End Time"><NativeTimeInput required value={meetingForm.endTime} onChange={(endTime) => setMeetingForm(prev => ({ ...prev, endTime }))} /></Field></div><div className="grid gap-4 md:grid-cols-2"><Field label="Meeting Type"><NativeSelect value={meetingForm.meetingType} onChange={(meetingType) => setMeetingForm(prev => ({ ...prev, meetingType }))} options={meetingTypeOptions} /></Field><Field label="Recurrence"><NativeSelect value={meetingForm.recurrence} onChange={(recurrence) => setMeetingForm(prev => ({ ...prev, recurrence }))} options={recurrenceOptions} /></Field></div><Field label="Participants"><div className="grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{projectUsers.map(user => { const userId = user._id || user.id; const selected = meetingForm.participants.includes(userId); return <button key={userId} type="button" onClick={() => setMeetingForm(prev => ({ ...prev, participants: selected ? prev.participants.filter(id => id !== userId) : [...prev.participants, userId] }))} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all ${selected ? 'border-violet-500 bg-violet-950/30 text-violet-200' : 'border-slate-800 text-slate-400 hover:bg-violet-950/30'}`}><span className="flex min-w-0 items-center gap-2"><Avatar name={user.name} avatar={user.avatar} className="h-7 w-7 text-[9px]" /><span className="truncate text-xs font-bold">{user.name}</span></span>{selected && <Check className="h-4 w-4" />}</button>; })}</div></Field><ModalActions onCancel={() => setShowScheduleModal(false)} submitLabel={editingMeeting ? 'Save Meeting' : 'Schedule Meeting'} disabled={!meetingForm.title.trim()} /></form></Modal>}
    </div>
  );
};

const dependencyBadgeClass = severity => severity === 'Critical'
  ? 'border-rose-900/50 bg-rose-950/25 text-rose-300'
  : severity === 'High'
    ? 'border-orange-900/50 bg-orange-950/25 text-orange-300'
    : 'border-amber-900/50 bg-amber-950/25 text-amber-300';

const DependencyGraphPanel = ({ analysis, visibleTasks, filter, setFilter, users, onOpenTask }) => {
  const taskAssignee = task => {
    const assigneeId = task?.assignee?._id || task?.assignee || task?.assigneeId;
    return typeof task?.assignee === 'object' ? task.assignee : users.find(user => String(user._id || user.id) === String(assigneeId));
  };

  return <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-violet-500" />
        <div>
          <h2 className="text-sm font-black text-slate-950 dark:text-white">Dependency Graph</h2>
          <p className="text-[11px] font-semibold text-slate-400">AI-detected task relationships, blockers, and critical path.</p>
        </div>
      </div>
      <NativeSelect value={filter} onChange={setFilter} options={dependencyFilterOptions} className="w-full md:w-56" />
    </div>

    <div className="grid gap-3 md:grid-cols-4">
      <DependencyMetric label="Tasks" value={analysis.tasks.length} />
      <DependencyMetric label="Connections" value={analysis.connections.length + analysis.suggestions.length} />
      <DependencyMetric label="Critical Path" value={analysis.criticalPath.tasks.length} />
      <DependencyMetric label="Blocked Tasks" value={analysis.blockedTasks.length} tone={analysis.blockedTasks.length ? 'text-rose-400' : 'text-emerald-400'} />
    </div>

    {analysis.risks.length > 0 && <div className="mt-4 grid gap-2 md:grid-cols-2">
      {analysis.risks.slice(0, 4).map((risk, index) => <div key={`${risk.type}-${index}`} className={`rounded-xl border px-3 py-2 ${dependencyBadgeClass(risk.severity)}`}>
        <p className="text-[10px] font-black uppercase tracking-wider">{risk.type}</p>
        <p className="mt-1 text-xs font-semibold leading-relaxed">{risk.description}</p>
      </div>)}
    </div>}

    <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {visibleTasks.slice(0, 9).map(task => {
        const blockedBy = getAcceptedDependencies(task, analysis.tasks).map(item => item.task);
        const suggestedCount = analysis.suggestions.filter(item => getTaskId(item.task) === getTaskId(task)).length;
        const assignee = taskAssignee(task);
        const blocked = blockedBy.some(item => item.status !== 'done');
        return <button key={getTaskId(task)} type="button" onClick={() => onOpenTask(getTaskId(task))} className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-300 dark:hover:border-violet-800 ${blocked ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/15' : 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40'}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-xs font-black text-slate-900 dark:text-white">{task.title}</p>
            <span className="shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">{task.priority || 'medium'}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-400">
            <span>{blockedBy.length} blocked by</span>
            <span>{analysis.connections.filter(edge => getTaskId(edge.dependency) === getTaskId(task)).length} blocks</span>
            {suggestedCount > 0 && <span className="text-violet-500 dark:text-violet-300">{suggestedCount} suggested</span>}
          </div>
          <p className="mt-2 truncate text-[11px] font-semibold text-slate-400">{assignee?.name || 'Unassigned'} · {task.status || 'todo'}</p>
        </button>;
      })}
      {visibleTasks.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs font-bold text-slate-400 dark:border-slate-800 lg:col-span-2 xl:col-span-3">No tasks match this dependency filter.</div>}
    </div>
  </section>;
};

const DependencyMetric = ({ label, value, tone = 'text-slate-950 dark:text-white' }) => <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/40"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-1 text-xl font-black ${tone}`}>{value}</p></div>;
const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</span>
    {children}
  </label>
);

const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
    <div className={`max-h-[90vh] w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-150`}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">{title}</h3>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const ModalActions = ({ onCancel, submitLabel, disabled = false }) => (
  <div className="flex justify-end gap-3 pt-2">
    <button type="button" onClick={onCancel} className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">Cancel</button>
    <button type="submit" disabled={disabled} className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">{submitLabel}</button>
  </div>
);

export default ProjectDetails;




















