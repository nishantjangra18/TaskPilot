import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, Calendar, Check, CheckCircle, ChevronLeft, Clock, Kanban, List, MessageSquare,
  Plus, Search, Settings, Trash2, UserMinus, UserPlus, Users, Video, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { getProjectIcon } from '../utils/iconHelper';
import { getProjectTheme } from '../utils/projectTheme';

const iconOptions = ['folder', 'rocket', 'laptop', 'smartphone', 'zap', 'target', 'barchart', 'gamepad', 'shoppingcart', 'palette', 'filetext', 'microscope', 'construction', 'globe', 'package', 'testtube', 'graduationcap', 'megaphone', 'sparkles', 'shield'];
const statusOptions = [['todo', 'To Do'], ['in_progress', 'In Progress'], ['review', 'Review'], ['done', 'Done']];
const priorityOptions = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];
const taskTypeOptions = [['feature', 'Feature'], ['bug', 'Bug'], ['improvement', 'Improvement'], ['research', 'Research'], ['documentation', 'Documentation']];
const meetingTypeOptions = [['video', 'Video'], ['audio', 'Audio'], ['planning', 'Planning'], ['review', 'Review'], ['standup', 'Standup'], ['other', 'Other']];
const recurrenceOptions = [['none', 'None'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
const today = () => new Date().toISOString().split('T')[0];
const nativeInputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 outline-hidden transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-violet-950";
const NativeSelect = ({ value, onChange, options, disabled = false }) => (
  <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={nativeInputClass}>
    {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
  </select>
);
const NativeDateInput = ({ value, onChange, required = false, min }) => (
  <input type="date" required={required} min={min} value={value} onChange={(event) => onChange(event.target.value)} className={nativeInputClass} />
);

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    projects, tasks, users, currentUser, addTask, editTask, deleteTask, editProject, deleteProject,
    addMemberToProject, removeMemberFromProject, searchUsersByEmail, sendInvitation,
    activeMeetings, meetings, startProjectMeeting, joinProjectMeeting, endProjectMeeting,
    startScheduledMeeting, scheduleProjectMeeting, updateProjectMeeting, cancelProjectMeeting,
  } = useApp();

  const project = projects.find(p => (p._id || p.id) === id);
  const [viewMode, setViewMode] = useState('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
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
  const projectMeetings = (meetings || []).filter(meeting => String(meeting.projectId?._id || meeting.projectId) === String(projectId)).filter(meeting => !['completed', 'ended'].includes(meeting.status));
  const activeMeeting = (activeMeetings || []).find(meeting => String(meeting.projectId?._id || meeting.projectId) === String(projectId) && ['live', 'active'].includes(meeting.status));

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
  const changeStatus = async (taskId, status) => editTask(taskId, { status });
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
  const stopMeeting = async (meeting = activeMeeting) => {
    if (meeting?._id) await endProjectMeeting(meeting._id);
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

  const statusColumns = [
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Done' },
  ];
  const taskCard = (task) => {
    const taskId = task._id || task.id;
    const canEdit = isCurrentOwner || String(task.assignee?._id || task.assignee) === String(currentUser?.id);
    return (
      <div key={taskId} onClick={() => navigate(`/projects/${projectId}/tasks/${taskId}`)} className="group rounded-2xl border border-slate-100 bg-white p-3 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-900/60 cursor-pointer">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{task.title}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-400 dark:text-slate-500">{task.description || 'No description'}</p></div>{isCurrentOwner && <button type="button" onClick={(e) => { e.stopPropagation(); removeTask(taskId, task.title); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-600 hover:text-white"><Trash2 className="h-4 w-4" /></button>}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400"><span className="rounded-lg border border-slate-100 px-2 py-1 dark:border-slate-800">{task.priority || 'medium'}</span><span className="rounded-lg border border-slate-100 px-2 py-1 dark:border-slate-800">{task.type || 'feature'}</span>{task.dueDate && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}</div>
        <div className="mt-3" onClick={(e) => e.stopPropagation()}><NativeSelect disabled={!canEdit} value={task.status || 'todo'} onChange={(status) => changeStatus(taskId, status)} options={statusOptions} buttonClassName="py-1.5 text-[10px] rounded-lg" /></div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">{getProjectIcon(project.icon, { className: 'h-7 w-7' })}</span>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-extrabold text-slate-900 dark:text-white">{project.name}</h1>{activeMeeting && <span className="rounded-full border border-emerald-900/40 bg-emerald-950/20 px-2 py-1 text-[10px] font-black uppercase text-emerald-400">Meeting Live</span>}</div><p className="mt-1 max-w-2xl text-sm text-slate-400 dark:text-slate-500">{project.description || 'No project description yet.'}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400"><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{projectUsers.length} members</span><span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />{projectTasks.filter(task => task.status === 'done').length}/{projectTasks.length} complete</span></div></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => navigate('/messages')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"><MessageSquare className="h-4 w-4" />Chat</button>
            <button type="button" onClick={() => setShowMembersModal(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"><Users className="h-4 w-4" />Members</button>
            {isCurrentOwner && <button type="button" onClick={() => setShowSettingsModal(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"><Settings className="h-4 w-4" />Settings</button>}
            {activeMeeting ? <button type="button" onClick={() => joinMeeting(activeMeeting)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-700"><Video className="h-4 w-4" />Join Meeting</button> : <button type="button" onClick={openStartMeetingModal} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-700"><Video className="h-4 w-4" />Start Meeting</button>}
            {isCurrentOwner && <button type="button" onClick={() => openScheduleMeetingModal()} className="inline-flex items-center gap-2 rounded-xl border border-violet-900/40 bg-violet-950/20 px-3 py-2 text-xs font-bold text-violet-300 transition-colors hover:bg-violet-900/30"><Calendar className="h-4 w-4" />Schedule</button>}
            <button type="button" onClick={() => setShowAddModal(true)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white ${theme.btnBg}`}><Plus className="h-4 w-4" />Task</button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..." className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-hidden transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" /></div>
        <NativeSelect value={priorityFilter} onChange={setPriorityFilter} options={[["all", "Priority: All"], ["high", "High Priority"], ["medium", "Medium Priority"], ["low", "Low Priority"]]} className="min-w-[160px]" />
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950"><button type="button" onClick={() => setViewMode('board')} className={`rounded-lg p-2 transition-colors ${viewMode === 'board' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-violet-300'}`} title="Board"><Kanban className="h-4 w-4" /></button><button type="button" onClick={() => setViewMode('list')} className={`rounded-lg p-2 transition-colors ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-violet-300'}`} title="List"><List className="h-4 w-4" /></button></div>
      </div>

      {projectMeetings.length > 0 && <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Project Meetings</h2><span className="text-[10px] font-bold text-slate-500">{projectMeetings.length} total</span></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{projectMeetings.slice(0, 6).map(meeting => <div key={meeting._id || meeting.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40"><p className="truncate text-xs font-extrabold text-slate-900 dark:text-white">{meeting.title || `${project.name} Meeting`}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{meeting.scheduledDate || 'Live'} {meeting.startTime ? `${meeting.startTime} - ${meeting.endTime}` : ''}</p><div className="mt-2 flex gap-2">{isCurrentOwner && !['live', 'active'].includes(meeting.status) && <button type="button" onClick={() => startScheduledMeeting(meeting._id || meeting.id).then(() => navigate(`/projects/${projectId}/meeting`))} className="rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-bold text-white">Start</button>}{['live', 'active'].includes(meeting.status) && <button type="button" onClick={() => joinMeeting(meeting)} className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">Join</button>}{isCurrentOwner && <button type="button" onClick={() => openScheduleMeetingModal(meeting)} className="rounded-lg border border-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">Edit</button>}{isCurrentOwner && <button type="button" onClick={() => cancelProjectMeeting(meeting._id || meeting.id)} className="rounded-lg border border-rose-900/50 px-2 py-1 text-[10px] font-bold text-rose-400">Cancel</button>}</div></div>)}</div></div>}

      {viewMode === 'board' ? <div className="grid gap-4 xl:grid-cols-4">{statusColumns.map(column => <section key={column.key} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/30"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-wider text-slate-500">{column.label}</h2><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{filteredTasks.filter(task => (task.status || 'todo') === column.key).length}</span></div><div className="space-y-3">{filteredTasks.filter(task => (task.status || 'todo') === column.key).map(taskCard)}{filteredTasks.filter(task => (task.status || 'todo') === column.key).length === 0 && <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs font-bold text-slate-400 dark:border-slate-800">No tasks</div>}</div></section>)}</div> : <div className="space-y-3">{filteredTasks.map(taskCard)}{filteredTasks.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm font-bold text-slate-400 dark:border-slate-800">No tasks found.</div>}</div>}

      {showAddModal && <Modal title="Create Task" onClose={() => setShowAddModal(false)}><form onSubmit={submitTask} className="space-y-4"><Field label="Task Title"><input required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={`${nativeInputClass}`} placeholder="Task title" /></Field><Field label="Description"><textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} className={`${nativeInputClass} h-24 resize-none`} placeholder="Task details" /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="Type"><NativeSelect value={taskType} onChange={setTaskType} options={taskTypeOptions} /></Field><Field label="Priority"><NativeSelect value={taskPriority} onChange={setTaskPriority} options={priorityOptions} /></Field><Field label="Status"><NativeSelect value={taskStatus} onChange={setTaskStatus} options={statusOptions} /></Field><Field label="Assignee"><NativeSelect value={taskAssigneeId} onChange={setTaskAssigneeId} options={[["", "Unassigned"], ...projectUsers.map(user => [user._id || user.id, user.name])]} /></Field><Field label="Due Date"><NativeDateInput required value={taskDueDate} onChange={setTaskDueDate} /></Field><Field label="Due Time"><input type="time" value={taskDueTime} onChange={(e) => setTaskDueTime(e.target.value)} className={`${nativeInputClass}`} /></Field></div><ModalActions onCancel={() => setShowAddModal(false)} submitLabel="Create Task" disabled={!taskTitle.trim()} /></form></Modal>}

      {showMembersModal && <Modal title="Project Members" onClose={() => setShowMembersModal(false)}><div className="space-y-4"><div className="space-y-2">{projectUsers.map(user => { const userId = user._id || user.id; const role = String(userId) === String(ownerId) ? 'Owner' : 'Member'; return <div key={userId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-950/40"><div className="flex min-w-0 items-center gap-3"><Avatar name={user.name} avatar={user.avatar} className="h-9 w-9 text-[11px]" /><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900 dark:text-white">{user.name}</p><p className="truncate text-[10px] text-slate-400">{user.email}</p></div></div><div className="flex items-center gap-2"><span className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-black uppercase text-slate-500 dark:border-slate-800">{role}</span>{isCurrentOwner && role !== 'Owner' && <button type="button" onClick={() => removeMemberFromProject(projectId, userId)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-600 hover:text-white"><UserMinus className="h-4 w-4" /></button>}</div></div>; })}</div>{isCurrentOwner && <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"><Field label="Invite or add by email"><div className="flex gap-2"><input value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); setInviteFeedback(''); }} className={`${nativeInputClass}`} placeholder="teammate@example.com" /><button type="button" onClick={inviteByEmail} className="rounded-xl bg-violet-600 px-3 text-xs font-bold text-white"><UserPlus className="h-4 w-4" /></button></div></Field>{inviteFeedback && <p className="mt-2 text-xs font-semibold text-violet-300">{inviteFeedback}</p>}{memberSearch.trim().length >= 5 && <div className="mt-2 space-y-1">{inviteMatches.length ? inviteMatches.map(user => <button key={user._id || user.id} type="button" onClick={() => addMember(user._id || user.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-slate-300 hover:bg-violet-950/40"><Avatar name={user.name} avatar={user.avatar} className="h-7 w-7 text-[9px]" />{user.name}<span className="ml-auto text-[10px] text-slate-500">{user.email}</span></button>) : <div className="rounded-lg border border-dashed border-slate-800 p-2 text-xs text-slate-400">No matching user found. Use invite to send an email invitation.</div>}</div>}</div>}</div></Modal>}

      {showSettingsModal && isCurrentOwner && <Modal title="Project Workspace Settings" onClose={() => setShowSettingsModal(false)}><form onSubmit={saveSettings} className="space-y-4"><Field label="Icon"><NativeSelect value={settingsIcon} onChange={setSettingsIcon} options={iconOptions.map(opt => [opt, opt])} /></Field><Field label="Project Name"><input required value={settingsName} onChange={(e) => setSettingsName(e.target.value)} className={`${nativeInputClass}`} /></Field><Field label="Description"><textarea value={settingsDesc} onChange={(e) => setSettingsDesc(e.target.value)} className={`${nativeInputClass} h-24 resize-none`} /></Field><Field label="Accent"><div className="flex flex-wrap gap-2">{['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'].map(color => <button key={color} type="button" onClick={() => setSettingsTheme(color)} className={`h-8 w-8 rounded-xl border-2 transition-all ${settingsTheme === color ? 'border-white scale-105' : 'border-slate-800'}`} style={{ backgroundColor: color }} />)}</div></Field><div className="flex justify-between gap-3 pt-2"><button type="button" onClick={removeProject} className="inline-flex items-center gap-2 rounded-xl border border-rose-900/50 px-4 py-2 text-xs font-bold text-rose-400 transition-colors hover:bg-rose-600 hover:text-white"><Trash2 className="h-4 w-4" />Delete Project</button><ModalActions onCancel={() => setShowSettingsModal(false)} submitLabel="Save Settings" /></div></form></Modal>}

      {showStartMeetingModal && <Modal title="Start New Meeting" onClose={() => setShowStartMeetingModal(false)}><form onSubmit={startMeeting} className="space-y-4"><Field label="Meeting Title"><input required value={startMeetingForm.title} onChange={(e) => setStartMeetingForm(prev => ({ ...prev, title: e.target.value }))} className={`${nativeInputClass}`} /></Field><Field label="Optional Description"><textarea value={startMeetingForm.description} onChange={(e) => setStartMeetingForm(prev => ({ ...prev, description: e.target.value }))} className={`${nativeInputClass} h-24 resize-none`} /></Field><ModalActions onCancel={() => setShowStartMeetingModal(false)} submitLabel={busy ? 'Starting...' : 'Start Meeting'} disabled={!startMeetingForm.title.trim() || busy} /></form></Modal>}

      {showScheduleModal && <Modal title={editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'} onClose={() => setShowScheduleModal(false)} wide><form onSubmit={saveMeeting} className="space-y-4"><Field label="Meeting Title"><input required value={meetingForm.title} onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))} className={`${nativeInputClass}`} /></Field><Field label="Description"><textarea value={meetingForm.description} onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))} className={`${nativeInputClass} h-20 resize-none`} /></Field><div className="grid gap-4 md:grid-cols-3"><Field label="Date"><NativeDateInput required value={meetingForm.date} onChange={(date) => setMeetingForm(prev => ({ ...prev, date }))} /></Field><Field label="Start Time"><input type="time" required value={meetingForm.startTime} onChange={(e) => setMeetingForm(prev => ({ ...prev, startTime: e.target.value }))} className={`${nativeInputClass}`} /></Field><Field label="End Time"><input type="time" required value={meetingForm.endTime} onChange={(e) => setMeetingForm(prev => ({ ...prev, endTime: e.target.value }))} className={`${nativeInputClass}`} /></Field></div><div className="grid gap-4 md:grid-cols-2"><Field label="Meeting Type"><NativeSelect value={meetingForm.meetingType} onChange={(meetingType) => setMeetingForm(prev => ({ ...prev, meetingType }))} options={meetingTypeOptions} /></Field><Field label="Recurrence"><NativeSelect value={meetingForm.recurrence} onChange={(recurrence) => setMeetingForm(prev => ({ ...prev, recurrence }))} options={recurrenceOptions} /></Field></div><Field label="Participants"><div className="grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{projectUsers.map(user => { const userId = user._id || user.id; const selected = meetingForm.participants.includes(userId); return <button key={userId} type="button" onClick={() => setMeetingForm(prev => ({ ...prev, participants: selected ? prev.participants.filter(id => id !== userId) : [...prev.participants, userId] }))} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all ${selected ? 'border-violet-500 bg-violet-950/30 text-violet-200' : 'border-slate-800 text-slate-400 hover:bg-violet-950/30'}`}><span className="flex min-w-0 items-center gap-2"><Avatar name={user.name} avatar={user.avatar} className="h-7 w-7 text-[9px]" /><span className="truncate text-xs font-bold">{user.name}</span></span>{selected && <Check className="h-4 w-4" />}</button>; })}</div></Field><ModalActions onCancel={() => setShowScheduleModal(false)} submitLabel={editingMeeting ? 'Save Meeting' : 'Schedule Meeting'} disabled={!meetingForm.title.trim()} /></form></Modal>}
    </div>
  );
};

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




