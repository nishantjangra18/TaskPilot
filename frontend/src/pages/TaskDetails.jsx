import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { API_BASE_URL } from '../config/api';
import { getProjectTheme } from '../utils/projectTheme';
import { getTaskDependencyView, getTaskId, mergeDependency } from '../services/smartDependencyManager';
import {
  ChevronRight,
  ArrowLeft,
  Calendar,
  User,
  Trash2,
  X,
  Paperclip,
  FileText,
  Download,
  Send,
  MessageSquare,
  Check,
  Plus,
  AlertTriangle,
  Edit,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Bug,
  Wrench,
  Search,
  ClipboardList,
  GitBranch
} from 'lucide-react';

const TaskDetails = () => {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();

  const {
    projects,
    tasks,
    users,
    currentUser,
    editTask,
    deleteTask,
    logActivity,
    apiFetch,
    refreshData,
    dataLoading
  } = useApp();

  const project = projects.find(p => (p._id || p.id) === projectId);
  const task = tasks.find(t => (t._id || t.id) === taskId);

  // States for Editable Fields
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState('');
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');

  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Drag & drop state for attachments
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [ignoredDependencySuggestions, setIgnoredDependencySuggestions] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (task) {
      setEditDescValue(task.description || '');
      setEditTitleValue(task.title || '');
    }
  }, [task]);


  const projectTasks = useMemo(() => {
    if (!project) return [];
    const activeProjectId = project._id || project.id;
    return tasks.filter(item => String(item.projectId?._id || item.projectId) === String(activeProjectId));
  }, [tasks, project]);
  const dependencyView = useMemo(() => getTaskDependencyView(task, projectTasks), [task, projectTasks]);
  const visibleDependencySuggestions = dependencyView.suggestions.filter(suggestion => !ignoredDependencySuggestions.includes(getTaskId(suggestion.task)));
  const incompleteDependencies = dependencyView.blockedBy.filter(item => item.status !== 'done');
  if (dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 animate-pulse">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mb-4"></div>
        <p className="text-sm font-semibold">Loading workspace task details...</p>
      </div>
    );
  }

  if (!project || !task) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 my-8 text-left max-w-2xl mx-auto">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Workspace Task Not Found</h2>
        <p className="text-slate-400 dark:text-slate-505 text-sm mt-1">This task or project does not exist or has been removed.</p>
        <Link to="/projects" className="mt-6 inline-flex items-center text-violet-600 hover:text-violet-750 font-semibold text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
        </Link>
      </div>
    );
  }

  const isCurrentOwner = (project.owner?._id || project.owner || project.ownerId || 'u1') === currentUser?.id;
  const taskAssigneeId = task.assignee?._id || task.assignee || task.assigneeId;
  const isTaskAssignee = taskAssigneeId === currentUser?.id;
  const hasEditPermission = isCurrentOwner || isTaskAssignee;

  // Resolve today's date string
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayString();
  const isOverdue = task.status !== 'done' && task.dueDate && task.dueDate < todayStr;

  // Retrieve user details
  const ownerId = project.owner?._id || project.owner || project.ownerId || 'u1';
  const assigneeUser = users.find(u => (u._id || u.id) === taskAssigneeId);
  const assigneeRole = taskAssigneeId
    ? (taskAssigneeId?.toString() === ownerId?.toString() ? 'Owner' : 'Member')
    : 'No assignee';

  // Theme configuration
  const theme = getProjectTheme(project.color);

  // Handler: Status Update
  const handleStatusChange = (nextStatus) => {
    if (!hasEditPermission) {
      alert("Permission Denied: Only project owners or the assignee can modify status.");
      return;
    }
    if (nextStatus === 'done' && task.status !== 'done' && incompleteDependencies.length) {
      const names = incompleteDependencies.map(item => item.title).join('\\n');
      const proceed = window.confirm('This task depends on:\\n\\n' + names + '\\n\\nContinue anyway?');
      if (!proceed) return;
    }
    const oldStatus = task.status;
    const tId = task._id || task.id;
    editTask(tId, { status: nextStatus, updatedAt: new Date().toISOString() });
    
    const statusLabels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
    logActivity(
      project._id || project.id, 
      currentUser.id, 
      `changed status of "${task.title}" from ${statusLabels[oldStatus] || oldStatus} â†’ ${statusLabels[nextStatus] || nextStatus}`
    );
  };



  // Handler: Toggle Mark Complete
  const handleToggleComplete = () => {
    if (!hasEditPermission) {
      alert("Permission Denied: Only project owners or the assignee can complete tasks.");
      return;
    }
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    handleStatusChange(nextStatus);
  };

  // Handler: Description Save
  const handleSaveDescription = () => {
    if (!isCurrentOwner) return;
    const tId = task._id || task.id;
    editTask(tId, { description: editDescValue, updatedAt: new Date().toISOString() });
    logActivity(project._id || project.id, currentUser.id, `updated the description of "${task.title}"`);
    setIsEditingDesc(false);
  };

  // Handler: Title Save
  const handleSaveTitle = () => {
    if (!isCurrentOwner) return;
    if (!editTitleValue.trim()) return;
    const tId = task._id || task.id;
    const oldTitle = task.title;
    editTask(tId, { title: editTitleValue, updatedAt: new Date().toISOString() });
    logActivity(project._id || project.id, currentUser.id, `renamed task "${oldTitle}" to "${editTitleValue}"`);
    setIsEditingTitle(false);
  };

  const acceptDependencySuggestion = async (dependencyTask) => {
    if (!isCurrentOwner) return;
    const tId = task._id || task.id;
    await editTask(tId, { dependencies: mergeDependency(task, dependencyTask), updatedAt: new Date().toISOString() });
    setIgnoredDependencySuggestions(prev => prev.filter(id => id !== getTaskId(dependencyTask)));
  };

  const ignoreDependencySuggestion = (dependencyTask) => {
    setIgnoredDependencySuggestions(prev => [...new Set([...prev, getTaskId(dependencyTask)])]);
  };

  // Handler: Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const tId = task?._id || task?.id;
    if (!tId) {
      console.error('Cannot add comment: taskId is undefined');
      alert('Cannot add comment: Task ID is missing');
      return;
    }
    try {
      const res = await apiFetch(`/tasks/${tId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText.trim() })
      });
      console.log('POST /api/tasks/:id/comments response:', res);
      if (res && res.success) {
        await refreshData();
        console.log('Task refresh response logged after comment creation.');
        setCommentText('');
      } else {
        alert('Failed to send comment: ' + (res?.message || 'Server error'));
      }
    } catch (err) {
      console.error('Comment submission error caught:', err);
      alert('Failed to send comment: ' + (err.message || 'Network error'));
    }
  };

  // Handler: Edit Comment
  const handleSaveEditComment = (commentId) => {
    if (!editingCommentText.trim()) return;
    
    const tId = task?._id || task?.id;
    if (!tId) return;
    const updatedComments = (task?.comments || []).map(c => 
      (c._id || c.id) === commentId ? { ...c, text: editingCommentText, updatedAt: new Date().toISOString() } : c
    );
    editTask(tId, { comments: updatedComments, updatedAt: new Date().toISOString() });
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  // Handler: Delete Comment
  const handleDeleteComment = (commentId) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      const tId = task?._id || task?.id;
      if (!tId) return;
      const updatedComments = (task?.comments || []).filter(c => (c._id || c.id) !== commentId);
      editTask(tId, { comments: updatedComments, updatedAt: new Date().toISOString() });
      if (project) {
        logActivity(project._id || project.id, currentUser?.id, `deleted a comment from "${task?.title || 'task'}"`);
      }
    }
  };

  // Handler: Delete Task
  const handleDeleteTask = () => {
    if (!isCurrentOwner) {
      alert("Permission Denied: Only project owners can delete tasks.");
      return;
    }
    const tId = task?._id || task?.id;
    const pId = project?._id || project?.id;
    if (!tId || !pId) {
      console.error('Cannot delete task: project ID or task ID is undefined', { pId, tId });
      alert('Cannot delete task: Missing identifiers');
      return;
    }
    if (confirm('Are you absolutely sure you want to delete this task? This cannot be undone.')) {
      try {
        deleteTask(tId);
        navigate(`/projects/${pId}`);
      } catch (err) {
        console.error('Error deleting task:', err);
        alert('Failed to delete task: ' + (err.message || 'Unknown error'));
      }
    }
  };

  // Real file upload helper
  const uploadFile = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setIsUploading(true);
      const res = await apiFetch('/upload', {
        method: 'POST',
        body: formData,
      });
      console.log('POST /api/upload response:', res);
      if (res && res.success && res.data) {
        const name = res.data.name || file.name || 'Uploaded File';
        const size = res.data.size || 'Unknown size';
        const type = res.data.type || 'unknown';
        const url = res.data.url || '';
        const uploadDate = res.data.uploadDate || new Date().toISOString().split('T')[0];
        const filename = res.data.filename || '';

        const newAttachment = {
          id: 'att_' + Date.now() + Math.random().toString(36).substring(2, 5),
          name: name,
          size: size,
          type: type,
          url: url,
          uploadDate: uploadDate,
          fileName: filename,
          originalName: name,
          fileSize: size,
          fileType: type,
          uploadedBy: currentUser?.id,
          uploadedAt: new Date(),
          projectId: project?._id || project?.id,
          taskId: task?._id || task?.id
        };
        const tId = task?._id || task?.id;
        if (!tId) {
          throw new Error('Task ID is missing');
        }
        const updatedAttachments = [...(task?.attachments || []), newAttachment];
        await editTask(tId, { attachments: updatedAttachments, updatedAt: new Date().toISOString() });
        await refreshData();
        console.log('Task refresh response logged after attachment upload.');
        if (project) {
          logActivity(project._id || project.id, currentUser?.id, `uploaded file "${name}" to task "${task?.title || 'task'}"`);
        }
      } else {
        alert('Upload failed: Incomplete response structure from server');
      }
    } catch (err) {
      console.error('File upload error caught:', err);
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => uploadFile(file));
    e.target.value = ''; // reset input
  };

  // Handler: Delete Attachment
  const handleDeleteAttachment = (attachmentId, attachmentName) => {
    if (confirm('Are you sure you want to delete this attachment?')) {
      const tId = task._id || task.id;
      const updatedAttachments = (task.attachments || []).filter(a => (a._id || a.id) !== attachmentId);
      editTask(tId, { attachments: updatedAttachments, updatedAt: new Date().toISOString() });
      logActivity(project._id || project.id, currentUser.id, `removed attachment "${attachmentName}" from "${task.title}"`);
    }
  };

  // Drag & drop events handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => uploadFile(file));
    }
  };

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    try {
      const [hour, minute] = timeStr.split(':');
      const h = parseInt(hour, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 || 12;
      return `${displayHour}:${minute} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const formatDueDate = (dateStr, timeStr) => {
    if (!dateStr) return 'No Date';
    const dateFormatted = new Date(dateStr).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
    if (timeStr && timeStr !== '23:59') {
      return `${dateFormatted} @ ${formatTime12h(timeStr)}`;
    }
    return dateFormatted;
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return 'No Date';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  };

  const formatDisplayLabel = (value) => {
    if (!value) return 'None';
    return value
      .toString()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getTaskTypeBadge = (type) => {
    const types = {
      feature: { label: 'Feature', icon: Sparkles, color: 'bg-violet-50 dark:bg-violet-955/20 text-violet-600 dark:text-violet-400 border-violet-100/30 dark:border-violet-900/40' },
      bug: { label: 'Bug', icon: Bug, color: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40' },
      improvement: { label: 'Improvement', icon: Wrench, color: 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40' },
      research: { label: 'Research', icon: Search, color: 'bg-violet-55/40 dark:bg-violet-955/20 text-violet-600 dark:text-violet-400 border-violet-100/30 dark:border-violet-900/40' },
      documentation: { label: 'Documentation', icon: FileText, color: 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/60' }
    };
    const t = types[type?.toLowerCase()] || { label: 'Task', icon: ClipboardList, color: 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/60' };
    const IconComponent = t.icon;
    return (
      <span className={`${t.color} border rounded-md px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider flex items-center space-x-1.5 w-fit`}>
        <IconComponent className="h-3 w-3" />
        <span>{t.label}</span>
      </span>
    );
  };

  const getFileIcon = (filetype) => {
    switch (filetype) {
      case 'pdf': return <FileText className="h-6 w-6 text-red-500" />;
      case 'zip':
      case 'rar': return <FileText className="h-6 w-6 text-amber-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg': return <FileText className="h-6 w-6 text-emerald-500" />;
      default: return <FileText className="h-6 w-6 text-blue-500" />;
    }
  };

  const renderDescription = (text) => {
    if (!text || text.trim() === '') {
      return (
        <p className="text-slate-400 dark:text-slate-500 italic text-xs py-4 text-center">
          No description provided. Click "Edit Description" to add one.
        </p>
      );
    }
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];

    lines.forEach((line, index) => {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      if (isBullet) {
        const content = line.trim().substring(2);
        currentList.push(
          <li key={`bullet-${index}`} className="list-disc ml-5 mb-1 text-slate-700 dark:text-slate-300">
            {content}
          </li>
        );
      } else {
        if (currentList.length > 0) {
          elements.push(<ul key={`list-${index}`} className="my-2 space-y-1 list-inside">{currentList}</ul>);
          currentList = [];
        }
        if (line.trim() !== '') {
          elements.push(
            <p key={`p-${index}`} className="mb-2.5 text-slate-700 dark:text-slate-400 leading-relaxed font-normal">
              {line}
            </p>
          );
        } else {
          elements.push(<div key={`br-${index}`} className="h-2" />);
        }
      }
    });

    if (currentList.length > 0) {
      elements.push(<ul key={`list-end`} className="my-2 space-y-1 list-inside">{currentList}</ul>);
    }

    return <div className="text-xs md:text-sm font-normal text-left">{elements}</div>;
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-rose-50 dark:bg-rose-905/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider block w-fit';
      case 'medium': return 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-450 border border-amber-100/60 dark:border-amber-900/50 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider block w-fit';
      default: return 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider block w-fit';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'todo':
        return (
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider flex items-center space-x-1.5 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>To Do</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="bg-violet-50 dark:bg-violet-950/20 text-violet-650 dark:text-violet-400 border border-violet-100/30 dark:border-violet-900/40 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider flex items-center space-x-1.5 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span>In Progress</span>
          </span>
        );
      case 'review':
        return (
          <span className="bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider flex items-center space-x-1.5 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Review</span>
          </span>
        );
      case 'done':
        return (
          <span className="bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider flex items-center space-x-1.5 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Done</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 animate-in fade-in duration-200 text-left relative ${isOverdue ? 'border-t-4 border-t-rose-500' : ''}`}>
      
      {/* Overdue Warning Alert */}
      {isOverdue && (
        <div className="bg-rose-50 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/40 rounded-xl p-4 flex items-center space-x-3 text-rose-700 dark:text-rose-400 select-none shadow-2xs">
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
          <div className="text-xs font-semibold leading-relaxed">
            <strong className="font-extrabold uppercase text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full mr-2">Overdue</strong>
            <span>This task is overdue. Please complete it as soon as possible.</span>
          </div>
        </div>
      )}

      {/* Breadcrumbs & Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-colors">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap items-center text-xs font-semibold text-slate-400 dark:text-slate-500">
          <Link to="/projects" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Projects</Link>
          <ChevronRight className="h-3.5 w-3.5 mx-1.5 shrink-0" />
          <Link to={`/projects/${project._id || project.id}`} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{project.name}</Link>
          <ChevronRight className="h-3.5 w-3.5 mx-1.5 shrink-0" />
          <span className="text-slate-800 dark:text-slate-200 truncate max-w-xs">{task.title}</span>
        </div>

        {/* Back to Project Trigger */}
        <button
          onClick={() => navigate(`/projects/${project._id || project.id}`)}
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span>Back to Project</span>
        </button>
      </div>

      {/* Title & Badge Summary header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-colors text-left space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2.5 flex-1 min-w-0">
            {/* Title Editing toggle */}
            {isEditingTitle ? (
              <div className="flex items-center space-x-2 w-full max-w-xl">
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  className="w-full text-lg md:text-xl font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500 transition-colors"
                  autoFocus
                  maxLength={100}
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={!editTitleValue.trim()}
                  className={`p-2.5 rounded-xl text-white ${theme.btnBg} cursor-pointer shadow-xs`}
                  title="Save Title"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingTitle(false);
                    setEditTitleValue(task.title);
                  }}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-pointer"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 group">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug truncate">
                  {task.title}
                </h1>
                {isCurrentOwner && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all duration-150 cursor-pointer"
                    title="Rename Task"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            
            {/* Meta details badge row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {getTaskTypeBadge(task.type)}
              {getStatusBadge(task.status)}
              <span className={getPriorityColor(task.priority)}>{task.priority}</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-505 font-semibold flex items-center space-x-1">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>Assigned to {assigneeUser?.name || 'Unassigned'}</span>
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold flex items-center space-x-1">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>Due: {formatDueDate(task.dueDate, task.dueTime)}</span>
              </span>
            </div>
          </div>

          {/* Quick toggle Mark Complete buttons */}
          <div className="shrink-0 flex items-center space-x-2">
            <button
              onClick={handleToggleComplete}
              className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all duration-150 active:scale-97 cursor-pointer flex items-center space-x-1.5 shadow-2xs ${
                task.status === 'done'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-205 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className={`h-4 w-4 ${task.status === 'done' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>{task.status === 'done' ? 'Completed' : 'Mark Complete'}</span>
            </button>
            
            {isCurrentOwner && (
              <button
                onClick={handleDeleteTask}
                className="p-2.5 border border-slate-200 dark:border-slate-850 hover:bg-rose-50 dark:hover:bg-rose-955/10 text-slate-400 hover:text-rose-500 rounded-xl transition-all duration-150 cursor-pointer shadow-2xs"
                title="Delete Task"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* LEFT SIDE (70% on desktop) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          
          {/* DESCRIPTION SECTION */}
          <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-colors flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50 dark:border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Description</h3>
              {isCurrentOwner && !isEditingDesc && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center space-x-1"
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit Description</span>
                </button>
              )}
            </div>

            {/* Editing mode vs Display mode */}
            {isEditingDesc ? (
              <div className="space-y-3 flex-1 flex flex-col">
                <textarea
                  value={editDescValue}
                  onChange={(e) => setEditDescValue(e.target.value)}
                  placeholder="Provide description. Support paragraph text and line items starting with '-' or '*' for bullets."
                  className="w-full flex-1 min-h-[160px] p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs md:text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 resize-y transition-all"
                />
                <div className="flex justify-end space-x-2.5">
                  <button
                    onClick={() => {
                      setIsEditingDesc(false);
                      setEditDescValue(task.description || '');
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    className={`px-4.5 py-2 text-white text-xs font-bold rounded-xl cursor-pointer ${theme.btnBg}`}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                {renderDescription(task.description)}
              </div>
            )}
          </div>

          <DependenciesSection
            blockedBy={dependencyView.blockedBy}
            blocks={dependencyView.blocks}
            suggestions={visibleDependencySuggestions}
            users={users}
            isCurrentOwner={isCurrentOwner}
            onOpenTask={(nextTaskId) => navigate('/projects/' + (project._id || project.id) + '/tasks/' + nextTaskId)}
            onAccept={acceptDependencySuggestion}
            onIgnore={ignoreDependencySuggestion}
          />

          {/* COMMENTS SECTION */}
          <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-colors text-left space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-455 dark:text-slate-505 uppercase tracking-wider flex items-center space-x-1.5">
                <MessageSquare className="h-4 w-4" />
                <span>Comments ({task?.comments?.length || 0})</span>
              </h3>
            </div>

            {/* Comment adding form */}
            <form onSubmit={handleAddComment} className="flex gap-3">
              <Avatar
                name={currentUser?.name}
                avatar={currentUser?.avatar}
                className="h-8 w-8 text-[11px] border border-slate-100 dark:border-slate-850 shadow-2xs"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Share a comment, feedback or ask questions..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs md:text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className={`p-2.5 rounded-xl border border-transparent text-white transition-colors flex items-center justify-center shrink-0 ${
                    commentText.trim() 
                      ? `${theme.btnBg} active:scale-97 cursor-pointer` 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Comments feed list (Slack/Linear style) */}
            {(!task?.comments || task.comments.length === 0) ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">No comments yet</p>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 text-xs md:text-sm">
                {(task.comments || []).map(c => {
                  if (!c) return null;
                  try {
                    const commentUserId = c.userId?._id || c.userId || c.userIdId;
                    const isAuthor = commentUserId === currentUser?.id;
                    const commentUser = users.find(u => (u._id || u.id) === commentUserId) || c || {};
                    let timeAgo = 'Just now';
                    if (c.createdAt) {
                      try {
                        timeAgo = new Date(c.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      } catch (e) {
                        console.error('Error parsing comment date:', e);
                      }
                    }

                    const commentId = c._id || c.id;

                    return (
                      <div key={commentId} className="flex items-start space-x-3 text-left group">
                        <Avatar
                          name={commentUser.name || commentUser.userName || 'User'}
                          avatar={commentUser.avatar || commentUser.userAvatar}
                          className="h-7 w-7 text-[9px] border border-slate-100 dark:border-slate-800"
                        />
                        
                        <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl relative">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{commentUser.name || commentUser.userName || 'User'}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeAgo}</span>
                            </div>

                            {/* Action triggers: Edit / Delete */}
                            {isAuthor && editingCommentId !== commentId && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 transition-all duration-150">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(commentId);
                                    setEditingCommentText(c.text || '');
                                  }}
                                  className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline bg-transparent border-0 cursor-pointer"
                                >
                                  Edit
                                </button>
                                <span className="text-slate-300 dark:text-slate-700">â€¢</span>
                                <button
                                  onClick={() => handleDeleteComment(commentId)}
                                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-transparent border-0 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Comment value editing inline */}
                          {editingCommentId === commentId ? (
                            <div className="space-y-2.5 mt-2">
                              <input
                                type="text"
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full px-3 py-1.5 border border-slate-205 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 focus:outline-hidden"
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentText('');
                                  }}
                                  className="px-2.5 py-1 text-[10px] border border-slate-200 dark:border-slate-800 text-slate-455 rounded-md bg-white dark:bg-slate-900 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEditComment(commentId)}
                                  className={`px-2.5 py-1 text-[10px] text-white rounded-md cursor-pointer ${theme.btnBg}`}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-600 dark:text-slate-350 leading-relaxed font-normal">{c.text || ''}</p>
                          )}
                        </div>
                      </div>
                    );
                  } catch (err) {
                    console.error('Error rendering comment item:', err);
                    return null;
                  }
                })}
              </div>
            )}
          </div>

          {/* ATTACHMENTS CARD */}
          <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-colors text-left space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Paperclip className="h-4 w-4" />
                <span>Attachments ({task?.attachments?.length || 0})</span>
              </h3>
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileInputChange}
                accept=".jpg,.jpeg,.png,.pdf,.docx,.zip,.txt"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center space-x-1 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
              </button>
            </div>

            {/* Drag and Drop Zone Container */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                dragActive 
                  ? 'border-violet-500 bg-violet-50/10 dark:bg-violet-950/5 shadow-inner' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-950/20'
              }`}
            >
              <div className="space-y-1.5 select-none pointer-events-none">
                <Paperclip className="h-8 w-8 mx-auto text-slate-400 dark:text-slate-500" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Drag and drop files here to attach
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Support images, PDFs, spreadsheets, and zip files.
                </p>
              </div>
            </div>

            {/* File List Grid */}
            {(!task?.attachments || task.attachments.length === 0) ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">No files uploaded</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {(task.attachments || []).map(att => {
                  if (!att) return null;
                  try {
                    const attId = att._id || att.id;
                    const attName = att.name || 'Unnamed file';
                    const attSize = att.size || att.fileSize || 'Unknown size';
                    const attType = att.type || att.fileType || 'unknown';
                    const attUrl = att.url || '';
                    
                    let formattedDate = 'Today';
                    if (att.uploadDate) {
                      try {
                        formattedDate = new Date(att.uploadDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
                      } catch (e) {
                        console.error('Error formatting attachment upload date:', e);
                      }
                    }

                    return (
                      <div 
                        key={attId} 
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100/90 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 overflow-hidden hover:shadow-2xs transition-shadow duration-150"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          {getFileIcon(attType)}
                          <div className="text-left min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={attName}>
                              {attName}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {attSize} â€¢ {formattedDate}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => {
                              try {
                                const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
                                const downloadUrl = attUrl && attUrl.startsWith('http') ? attUrl : `${baseUrl}${attUrl}`;
                                window.open(downloadUrl, '_blank');
                              } catch (e) {
                                console.error('Error opening attachment URL:', e);
                                alert('Could not open the attachment file link');
                              }
                            }}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl transition-all cursor-pointer"
                            title="Download Attachment"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {isCurrentOwner && (
                            <button
                              onClick={() => handleDeleteAttachment(attId, attName)}
                              className="p-2 border border-transparent hover:border-red-100 dark:hover:border-red-955/10 hover:bg-red-50 dark:hover:bg-red-955/10 text-slate-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer"
                              title="Delete Attachment"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  } catch (err) {
                    console.error('Error rendering attachment item:', err);
                    return null;
                  }
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE (30% on desktop) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TASK INFORMATION PANEL CARD */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-colors text-left space-y-5">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-50 dark:border-slate-800/85">
              Task Details Info
            </h3>

            {/* Project field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Project</label>
              <Link 
                to={`/projects/${project._id || project.id}`} 
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                <span>{project.name}</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>

            {/* Assignee field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Assignee</label>
              <div className="flex items-center space-x-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <Avatar
                  name={assigneeUser?.name || 'Unassigned'}
                  avatar={assigneeUser?.avatar}
                  className="h-8 w-8 text-[10px]"
                />
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{assigneeUser?.name || 'Unassigned'}</p>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{assigneeRole}</p>
                </div>
              </div>
            </div>

            {/* Status Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Status</label>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                {getStatusBadge(task.status)}
              </div>
            </div>

            {/* Task Type Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Task Type</label>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                {getTaskTypeBadge(task.type || 'feature')}
              </div>
            </div>

            {/* Priority Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Priority</label>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <span className={getPriorityColor(task.priority)}>{formatDisplayLabel(task.priority || 'medium')}</span>
              </div>
            </div>

            {/* Due Date field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Due Date</label>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                {formatDateOnly(task.dueDate)}
              </div>
            </div>

            {/* Due Time field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Due Time</label>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                {task.dueTime ? formatTime12h(task.dueTime) : 'No Time'}
              </div>
            </div>
            {/* Read only metadata fields */}
            <div className="pt-3 border-t border-slate-50 dark:border-slate-800 space-y-2.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              <div className="flex justify-between">
                <span>Created Date</span>
                <span className="text-slate-600 dark:text-slate-400 font-bold">
                  {new Date(task.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated</span>
                <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center space-x-1">
                  <RefreshCw className="h-3 w-3 inline shrink-0 animate-spin duration-3000" />
                  <span>
                    {task.updatedAt 
                      ? new Date(task.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})
                      : new Date(task.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})
                    }
                  </span>
                </span>
              </div>
            </div>
            </div>

        </div>

      </div>

    </div>
  );
};

const dependencyStatusClass = status => status === 'done'
  ? 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-300'
  : status === 'in_progress'
    ? 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-300'
    : status === 'review'
      ? 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-300'
      : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300';

const DependenciesSection = ({ blockedBy, blocks, suggestions, users, isCurrentOwner, onOpenTask, onAccept, onIgnore }) => (
  <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-colors text-left space-y-5">
    <div className="flex items-center justify-between border-b border-slate-50 pb-2 dark:border-slate-800/80">
      <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
        <GitBranch className="h-4 w-4" />
        <span>Dependencies</span>
      </h3>
      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase text-violet-600 dark:bg-violet-950/25 dark:text-violet-300">AI Assisted</span>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <DependencyColumn title="Blocked By" tasks={blockedBy} users={users} empty="No required dependencies." onOpenTask={onOpenTask} />
      <DependencyColumn title="Blocks" tasks={blocks} users={users} empty="This task is not blocking other tasks." onOpenTask={onOpenTask} />
    </div>

    <div className="rounded-2xl border border-dashed border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-black text-slate-900 dark:text-white">Suggested Dependencies</h4>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Detected from task title, description, priority, milestone, assignee, hours, and existing project tasks.</p>
        </div>
        <span className="shrink-0 text-[10px] font-black uppercase text-slate-400">{suggestions.length} found</span>
      </div>
      {suggestions.length ? <div className="space-y-2">
        {suggestions.map(suggestion => <div key={getTaskId(suggestion.task)} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-slate-900 dark:text-white">{suggestion.task.title}</p>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-400">Reason: {suggestion.reason}</p>
            </div>
            {isCurrentOwner && <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => onAccept(suggestion.task)} className="rounded-lg bg-violet-600 px-3 py-1.5 text-[10px] font-black text-white">Accept</button>
              <button type="button" onClick={() => onIgnore(suggestion.task)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black text-slate-500 dark:border-slate-800 dark:text-slate-400">Ignore</button>
            </div>}
          </div>
        </div>)}
      </div> : <p className="py-4 text-center text-xs font-semibold text-slate-400">No AI dependency suggestions right now.</p>}
    </div>
  </div>
);

const DependencyColumn = ({ title, tasks, users, empty, onOpenTask }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</h4>
      <span className="text-[10px] font-black text-slate-400">{tasks.length}</span>
    </div>
    {tasks.length ? tasks.map(task => <DependencyTaskCard key={getTaskId(task)} task={task} users={users} onOpenTask={onOpenTask} />) : <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-400 dark:border-slate-800">{empty}</div>}
  </div>
);

const DependencyTaskCard = ({ task, users, onOpenTask }) => {
  const assigneeId = task.assignee?._id || task.assignee || task.assigneeId;
  const assignee = typeof task.assignee === 'object' ? task.assignee : users.find(user => String(user._id || user.id) === String(assigneeId));
  return <button type="button" onClick={() => onOpenTask(getTaskId(task))} className="w-full rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-900/60 dark:hover:bg-violet-950/10">
    <div className="flex items-start justify-between gap-3">
      <p className="line-clamp-2 text-xs font-black text-slate-900 dark:text-white">{task.title}</p>
      <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase ${dependencyStatusClass(task.status)}`}>{task.status || 'todo'}</span>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
      <span className="rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-800">{task.priority || 'medium'}</span>
      <span>{assignee?.name || 'Unassigned'}</span>
    </div>
  </button>;
};
export default TaskDetails;
