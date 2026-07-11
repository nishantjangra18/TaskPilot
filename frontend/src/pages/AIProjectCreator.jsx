import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ClipboardList,
  Loader2,
  Plus,
  Send,
  TimerReset,
  Trash2,
  Users,
  Layers3,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AI_REQUEST_STATUS, createAIProject, generateAIProjectPreview } from '../services/aiService';
import TaskPilotLogoIcon from '../components/TaskPilotLogoIcon';

const initialMessages = [
  {
    role: 'assistant',
    content: 'Describe the project you want to manage in TaskPilot. I will turn it into milestones, epics, tasks, assignments, dates, risks, and estimates.',
  },
];

const suggestedPrompts = [
  'Create a hospital management system project for a 4 month timeline with React, Node.js, MongoDB, and a small team.',
  'Plan an ecommerce dashboard project with admin analytics, inventory, payments, and notifications.',
  'Build a task management mobile app project for a solo full-stack developer over 8 weeks.',
];

const getCreatorTasks = (project) => (project?.milestones || []).flatMap((milestone, milestoneIndex) =>
  (milestone.epics || []).flatMap((epic, epicIndex) =>
    (epic.tasks || []).map((task, taskIndex) => ({ task, milestoneIndex, epicIndex, taskIndex, milestone, epic }))
  )
);

const getDraftCounts = (project) => {
  const milestones = project?.milestones || [];
  const epics = milestones.flatMap(milestone => milestone.epics || []);
  const tasks = epics.flatMap(epic => epic.tasks || []);
  const subtasks = tasks.flatMap(task => task.subtasks || []);
  const hours = tasks.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0);
  return { milestones: milestones.length, epics: epics.length, tasks: tasks.length, subtasks: subtasks.length, hours };
};

const Stat = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
    <Icon className="mb-2 h-4 w-4 text-violet-500 dark:text-violet-400" />
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
    <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{value}</p>
  </div>
);

const EmptyPreview = () => (
  <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
    <TaskPilotLogoIcon className="h-10 w-10" alt="TaskPilot AI" />
    <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-white">Project Preview</h2>
    <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
      Start a conversation on the left. The preview will appear here when TaskPilot AI has enough project details.
    </p>
  </div>
);

const ConfirmModal = ({ projectName, busy, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">Create Project</h3>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
            This will create {projectName || 'this project'} in TaskPilot with its milestones, tasks, subtasks, assignments, logs, and notifications.
          </p>
        </div>
        <button type="button" onClick={onCancel} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white hover:bg-violet-500 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Confirm Create
        </button>
      </div>
    </div>
  </div>
);

const AIProjectCreator = () => {
  const navigate = useNavigate();
  const { users = [], refreshData } = useApp();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState(AI_REQUEST_STATUS.IDLE);
  const [createStatus, setCreateStatus] = useState(AI_REQUEST_STATUS.IDLE);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef(null);

  const counts = useMemo(() => getDraftCounts(draft), [draft]);
  const tasks = useMemo(() => getCreatorTasks(draft), [draft]);
  const assigneeOptions = users.map(user => ({ id: user._id || user.id, label: `${user.name || user.email}${user.title ? ` - ${user.title}` : ''}` }));
  const isLoading = status === AI_REQUEST_STATUS.LOADING;
  const isCreating = createStatus === AI_REQUEST_STATUS.LOADING;

  const conversationHistory = () => messages
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .map(message => ({ role: message.role, content: message.content }));

  const resetProject = () => {
    setMessages(initialMessages);
    setInput('');
    setDraft(null);
    setError('');
    setStatus(AI_REQUEST_STATUS.IDLE);
    setCreateStatus(AI_REQUEST_STATUS.IDLE);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  };

  const clearChat = () => {
    setMessages(initialMessages);
    setError('');
    setInput('');
  };

  const sendPrompt = async (promptText = input) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError('');

    const result = await generateAIProjectPreview({
      message: trimmed,
      conversationHistory: conversationHistory(),
      onStatusChange: setStatus,
    });

    if (!result.success) {
      setError(result.message || 'TaskPilot AI could not generate the project preview.');
      return;
    }

    const questionText = result.needsMoreInfo && result.questions?.length
      ? `${result.response}\n\n${result.questions.map((question, index) => `${index + 1}. ${question}`).join('\n')}`
      : result.response;

    setMessages(current => [...current, { role: 'assistant', content: questionText || 'I created a project preview.' }]);
    if (result.project) setDraft(result.project);
  };

  const updateDraft = (updates) => setDraft(current => ({ ...current, ...updates }));
  const updateArrayText = (field, value) => updateDraft({ [field]: value.split(',').map(item => item.trim()).filter(Boolean) });

  const updateMilestone = (milestoneIndex, updates) => {
    setDraft(current => ({
      ...current,
      milestones: (current.milestones || []).map((milestone, index) => index === milestoneIndex ? { ...milestone, ...updates } : milestone),
    }));
  };

  const updateTask = (milestoneIndex, epicIndex, taskIndex, updates) => {
    setDraft(current => ({
      ...current,
      milestones: (current.milestones || []).map((milestone, mIndex) => {
        if (mIndex !== milestoneIndex) return milestone;
        return {
          ...milestone,
          epics: (milestone.epics || []).map((epic, eIndex) => {
            if (eIndex !== epicIndex) return epic;
            return {
              ...epic,
              tasks: (epic.tasks || []).map((task, tIndex) => tIndex === taskIndex ? { ...task, ...updates } : task),
            };
          }),
        };
      }),
    }));
  };

  const deleteTask = (milestoneIndex, epicIndex, taskIndex) => {
    setDraft(current => ({
      ...current,
      milestones: (current.milestones || []).map((milestone, mIndex) => {
        if (mIndex !== milestoneIndex) return milestone;
        return {
          ...milestone,
          epics: (milestone.epics || []).map((epic, eIndex) => eIndex === epicIndex
            ? { ...epic, tasks: (epic.tasks || []).filter((_, index) => index !== taskIndex) }
            : epic),
        };
      }),
    }));
  };

  const addTask = () => {
    setDraft(current => {
      const base = current || { name: 'New AI Project', description: '', milestones: [] };
      const milestones = base.milestones?.length ? [...base.milestones] : [{ title: 'Milestone 1', description: '', phase: 'Planning', dueDate: base.deadline || null, epics: [] }];
      const firstMilestone = { ...milestones[0] };
      const epics = firstMilestone.epics?.length ? [...firstMilestone.epics] : [{ title: 'General', tasks: [] }];
      epics[0] = {
        ...epics[0],
        tasks: [...(epics[0].tasks || []), {
          title: 'New task',
          description: '',
          priority: 'medium',
          status: 'todo',
          taskType: 'feature',
          estimatedHours: 1,
          suggestedAssigneeId: '',
          suggestedAssigneeName: '',
          dueDate: base.deadline || null,
          dependencies: [],
          subtasks: [],
        }],
      };
      firstMilestone.epics = epics;
      milestones[0] = firstMilestone;
      return { ...base, milestones };
    });
  };

  const confirmCreate = async () => {
    if (!draft || isCreating) return;
    setCreateStatus(AI_REQUEST_STATUS.LOADING);
    setError('');

    const result = await createAIProject(draft);
    if (!result.success) {
      setCreateStatus(AI_REQUEST_STATUS.ERROR);
      setError(result.message || 'Could not create this project.');
      setConfirmOpen(false);
      return;
    }

    setCreateStatus(AI_REQUEST_STATUS.SUCCESS);
    setConfirmOpen(false);
    toast.success(`${result.projectName || draft.name || 'Project'} created successfully.`);
    await refreshData?.();
    const projectId = result.projectId || result.data?.project?._id || result.data?.project?.id;
    if (projectId) navigate(`/projects/${projectId}`);
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">
            <Sparkles className="h-5 w-5" /> AI Project Creator
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Create a TaskPilot project with AI</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Chat on the left, review and edit the project structure on the right.</p>
        </div>
        <button type="button" onClick={resetProject} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-950/20 hover:bg-violet-500">
          New Project
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <TaskPilotLogoIcon className="h-8 w-8" alt="TaskPilot AI" />
              <div>
                <h2 className="text-sm font-black text-slate-950 dark:text-white">Project Conversation</h2>
                <p className="text-[11px] font-bold text-slate-400">Describe scope, team, timeline, and goals</p>
              </div>
            </div>
            <button type="button" onClick={clearChat} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">Clear Chat</button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:#7c3aed_transparent]">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-xs font-semibold leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-violet-600 text-white' : 'rounded-bl-md border border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950"><span className="inline-flex items-center gap-2"><TaskPilotLogoIcon className="h-5 w-5" alt="TaskPilot AI" />TaskPilot AI is preparing the preview...</span></div>}
            {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-xs font-bold text-rose-500 dark:text-rose-300">{error}</div>}
          </div>

          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestedPrompts.map(prompt => (
                <button key={prompt} type="button" onClick={() => sendPrompt(prompt)} disabled={isLoading} className="rounded-xl border border-slate-200 px-3 py-2 text-left text-[11px] font-bold text-slate-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-60 dark:border-slate-800 dark:text-slate-400 dark:hover:border-violet-800 dark:hover:text-violet-300">
                  {prompt}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
              <textarea ref={inputRef} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendPrompt(); } }} disabled={isLoading} rows={3} placeholder="I want to build..." className="max-h-36 min-h-20 w-full resize-none bg-transparent px-2 py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-white" />
              <div className="flex justify-end">
                <button type="button" onClick={() => sendPrompt()} disabled={!input.trim() || isLoading} className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white hover:bg-violet-500 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Generate Preview
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="relative min-h-[640px] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
          {!draft ? <EmptyPreview /> : (
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-violet-500 dark:text-violet-300">Project Summary</p>
                    <input value={draft.name || ''} onChange={event => updateDraft({ name: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-black text-slate-950 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                  </div>
                  <button type="button" onClick={() => setConfirmOpen(true)} disabled={isCreating} className="hidden shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-950/20 hover:bg-violet-500 disabled:opacity-60 md:inline-flex">
                    Create Project
                  </button>
                </div>
                <textarea value={draft.description || ''} onChange={event => updateDraft({ description: event.target.value })} rows={3} className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-slate-700 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" />
                <div className="mt-3 grid gap-3 sm:grid-cols-5">
                  <Stat icon={CalendarDays} label="Timeline" value={draft.timeline || draft.estimatedDuration || 'Open'} />
                  <Stat icon={ClipboardList} label="Milestones" value={counts.milestones} />
                  <Stat icon={Layers3} label="Epics" value={counts.epics} />
                  <Stat icon={Users} label="Tasks" value={counts.tasks} />
                  <Stat icon={TimerReset} label="Hours" value={counts.hours} />
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-24 [scrollbar-width:thin] [scrollbar-color:#7c3aed_transparent]">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Category</span><input value={draft.category || ''} onChange={event => updateDraft({ category: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" /></label>
                  <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Deadline</span><input type="date" value={draft.deadline || ''} onChange={event => updateDraft({ deadline: event.target.value || null })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" /></label>
                </div>
                <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Tech Stack</span><input value={(draft.techStack || []).join(', ')} onChange={event => updateArrayText('techStack', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" /></label>

                <section className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400"><Users className="h-4 w-4 text-violet-400" /> Assignments</div>
                  <div className="flex flex-wrap gap-2">
                    {(draft.team || []).map((member, index) => <span key={`${member.name}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{member.name || 'Member'}{member.role ? ` - ${member.role}` : ''}</span>)}
                  </div>
                </section>

                {(draft.milestones || []).map((milestone, milestoneIndex) => (
                  <section key={`${milestone.title}-${milestoneIndex}`} className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid gap-2 md:grid-cols-[1fr_150px]">
                      <input value={milestone.title || ''} onChange={event => updateMilestone(milestoneIndex, { title: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-950 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                      <input type="date" value={milestone.dueDate || ''} onChange={event => updateMilestone(milestoneIndex, { dueDate: event.target.value || null })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" />
                    </div>
                    <textarea value={milestone.description || ''} onChange={event => updateMilestone(milestoneIndex, { description: event.target.value })} rows={2} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" />
                    <div className="mt-3 space-y-3">
                      {(milestone.epics || []).map((epic, epicIndex) => (
                        <div key={`${epic.title}-${epicIndex}`} className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-violet-500 dark:text-violet-300">{epic.title || 'Epic'}</p>
                          {(epic.tasks || []).map((task, taskIndex) => (
                            <article key={`${task.title}-${taskIndex}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                              <div className="flex items-start gap-2">
                                <input value={task.title || ''} onChange={event => updateTask(milestoneIndex, epicIndex, taskIndex, { title: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-black text-slate-950 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
                                <button type="button" onClick={() => deleteTask(milestoneIndex, epicIndex, taskIndex)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" title="Delete task"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                              <textarea value={task.description || ''} onChange={event => updateTask(milestoneIndex, epicIndex, taskIndex, { description: event.target.value })} rows={2} className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" />
                              <div className="mt-2 grid gap-2 md:grid-cols-4">
                                <select value={task.priority || 'medium'} onChange={event => updateTask(milestoneIndex, epicIndex, taskIndex, { priority: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-bold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
                                <input type="date" value={task.dueDate || ''} onChange={event => updateTask(milestoneIndex, epicIndex, taskIndex, { dueDate: event.target.value || null })} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-bold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" />
                                <input type="number" min="0" value={task.estimatedHours || 0} onChange={event => updateTask(milestoneIndex, epicIndex, taskIndex, { estimatedHours: Number(event.target.value) || 0 })} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-bold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" />
                                <select value={task.suggestedAssigneeId || ''} onChange={event => { const selected = assigneeOptions.find(option => option.id === event.target.value); updateTask(milestoneIndex, epicIndex, taskIndex, { suggestedAssigneeId: event.target.value, suggestedAssigneeName: selected?.label?.split(' - ')[0] || '' }); }} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-bold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><option value="">Unassigned</option>{assigneeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
                              </div>
                              {Array.isArray(task.dependencies) && task.dependencies.length > 0 && <p className="mt-2 text-[11px] font-semibold text-slate-400">Dependencies: {task.dependencies.join(', ')}</p>}
                            </article>
                          ))}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400"><AlertTriangle className="h-4 w-4 text-amber-400" /> Risks</div>
                  <div className="space-y-2">
                    {(draft.riskAnalysis || []).map((risk, index) => <div key={`${risk.title}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950"><p className="text-xs font-black text-slate-950 dark:text-white">{risk.title}</p><p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{risk.level} risk - {risk.mitigation}</p></div>)}
                  </div>
                </section>
              </div>

              <div className="absolute bottom-0 right-0 left-0 border-t border-slate-100 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={addTask} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"><Plus className="h-4 w-4" />Add Task</button>
                  <button type="button" onClick={() => setConfirmOpen(true)} disabled={isCreating || tasks.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-950/20 hover:bg-violet-500 disabled:opacity-60">Create Project</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {confirmOpen && <ConfirmModal projectName={draft?.name} busy={isCreating} onCancel={() => setConfirmOpen(false)} onConfirm={confirmCreate} />}
    </div>
  );
};

export default AIProjectCreator;
