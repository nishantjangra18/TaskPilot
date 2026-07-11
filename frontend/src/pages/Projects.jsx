import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import CreateProjectModal from '../components/CreateProjectModal';
import Avatar from '../components/Avatar';
import { getProjectTheme } from '../utils/projectTheme';
import { getProjectIcon } from '../utils/iconHelper';
import { 
  Plus, 
  Search, 
  Trash2, 
  Calendar,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';

const Projects = () => {
  const { projects, tasks, users, deleteProject, currentUser, dataLoading } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayString();

  const getProjectStats = (projectId) => {
    const projTasks = tasks.filter(t => t.projectId === projectId);
    const todo = projTasks.filter(t => t.status === 'todo').length;
    const inProgress = projTasks.filter(t => t.status === 'in_progress').length;
    const review = projTasks.filter(t => t.status === 'review').length;
    const completed = projTasks.filter(t => t.status === 'done').length;
    const total = projTasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Overdue tasks (pending tasks with due date in the past)
    const overdueTasks = projTasks.filter(t => 
      t.status !== 'done' && t.dueDate && t.dueDate < todayStr
    );

    // Approaching deadline (within 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];
    const approachingTasks = projTasks.filter(t =>
      t.status !== 'done' && t.dueDate && t.dueDate >= todayStr && t.dueDate <= threeDaysStr
    );

    // Nearest due date among pending tasks
    const pendingWithDue = projTasks
      .filter(t => t.status !== 'done' && t.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const nearestDueDate = pendingWithDue.length > 0 ? pendingWithDue[0].dueDate : null;

    return { todo, inProgress, review, completed, total, rate, overdueTasks, approachingTasks, nearestDueDate };
  };

  // Health status calculation
  const getHealthStatus = (stats) => {
    if (stats.total === 0) return { label: 'New', color: 'slate', icon: null };
    if (stats.rate === 100) return { label: 'Completed', color: 'emerald', icon: CheckCircle2 };
    if (stats.overdueTasks.length > 0) return { label: 'Delayed', color: 'rose', icon: AlertTriangle };
    if (stats.approachingTasks.length > 0) return { label: 'At Risk', color: 'amber', icon: Clock };
    return { label: 'On Track', color: 'emerald', icon: CheckCircle2 };
  };

  // Get project members (owner + members)
  const getProjectMembers = (project) => {
    const ownerId = project.owner?._id || project.owner || project.ownerId;
    const memberIds = [ownerId, ...(project.members || []).map(m => m._id || m)];
    const uniqueIds = [...new Set(memberIds)];
    return uniqueIds.map(id => users.find(u => (u._id || u.id) === id)).filter(Boolean);
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => {
        const pId = p._id || p.id;
        const stats = getProjectStats(pId);
        const health = getHealthStatus(stats);

        switch (activeFilter) {
          case 'active':
            return stats.rate < 100 && stats.total > 0;
          case 'completed':
            return stats.rate === 100 && stats.total > 0;
          case 'at_risk':
            return health.label === 'At Risk';
          case 'delayed':
            return health.label === 'Delayed';
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [projects, searchQuery, activeFilter, tasks, todayStr]);

  if (dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 animate-pulse">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mb-4"></div>
        <p className="text-sm font-semibold">Loading project workspaces...</p>
      </div>
    );
  }

  const filterChips = [
    { id: 'all', label: 'All Projects', count: projects.length },
    { id: 'active', label: 'Active', count: projects.filter(p => { const s = getProjectStats(p._id || p.id); return s.rate < 100 && s.total > 0; }).length },
    { id: 'completed', label: 'Completed', count: projects.filter(p => { const s = getProjectStats(p._id || p.id); return s.rate === 100 && s.total > 0; }).length },
    { id: 'at_risk', label: 'At Risk', count: projects.filter(p => { const s = getProjectStats(p._id || p.id); const h = getHealthStatus(s); return h.label === 'At Risk'; }).length },
    { id: 'delayed', label: 'Delayed', count: projects.filter(p => { const s = getProjectStats(p._id || p.id); const h = getHealthStatus(s); return h.label === 'Delayed'; }).length },
  ];

  const handleDelete = (e, id, projName) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${projName}"? This will delete all tasks under it.`)) {
      deleteProject(id);
    }
  };

  const getHealthBadgeClasses = (health) => {
    const colorMap = {
      emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
      rose: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40',
      amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40',
      slate: 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/50',
    };
    return colorMap[health.color] || colorMap.slate;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Projects</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Configure workspaces, tracks, and project pipelines.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="sm:self-center px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-2 shadow-xs items-center space-x-2 transition-colors">
        <div className="pl-3 text-slate-400 dark:text-slate-500">
          <Search className="h-4.5 w-4.5" />
        </div>
        <input 
          type="text"
          placeholder="Search projects by name or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-0 focus:outline-hidden text-sm py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold px-2 shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeFilter === chip.id
                ? 'bg-violet-50 dark:bg-violet-955 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/50 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-200 dark:hover:border-slate-700'
            }`}
          >
            <span>{chip.label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
              activeFilter === chip.id
                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
            }`}>
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-16 text-center text-slate-450 dark:text-slate-500 transition-colors">
          <div className="inline-flex p-3 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 rounded-xl mb-3">
            <FolderOpen className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
            {activeFilter !== 'all' ? `No ${filterChips.find(c => c.id === activeFilter)?.label.toLowerCase()} projects found` : 'No projects matched search criteria'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {activeFilter !== 'all' ? 'Try selecting a different filter or create a new project.' : 'Try refining your search terms or create a new project track.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const projId = project._id || project.id;
            if (!projId) return null;
            const stats = getProjectStats(projId);
            const health = getHealthStatus(stats);
            const HealthIcon = health.icon;
            const members = getProjectMembers(project);

            return (
              <div
                key={projId}
                onClick={() => {
                  const pId = project._id || project.id;
                  if (pId) navigate(`/projects/${pId}`);
                }}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between text-left group relative ${getProjectTheme(project.color).softBorder} ${getProjectTheme(project.color).hoverBorder}`}
              >
                <div>
                  {/* Top line: Icon + Health Badge + Delete */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg flex items-center justify-center" title={project.name}>{getProjectIcon(project.icon, { className: "h-5 w-5 text-slate-700 dark:text-slate-205" })}</span>
                      {/* Health Status Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getHealthBadgeClasses(health)}`}>
                        {HealthIcon && <HealthIcon className="h-2.5 w-2.5" />}
                        {health.label}
                      </span>
                    </div>
                    {((project.owner?._id || project.owner || project.ownerId) === currentUser?.id) && (
                      <button 
                        onClick={(e) => handleDelete(e, project._id || project.id, project.name)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-455 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Delete Project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Name & description */}
                  <h3 className={`font-bold text-slate-900 dark:text-white ${getProjectTheme(project.color).accentText} transition-colors text-base leading-snug`}>{project.name}</h3>
                  <p className="text-slate-400 dark:text-slate-550 text-xs mt-2 line-clamp-2 leading-relaxed">{project.description || 'No description provided.'}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800/80 space-y-4">
                  {/* Team Members + Due Date row */}
                  <div className="flex items-center justify-between">
                    {/* Team Members */}
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {members.slice(0, 3).map((member) => (
                          <Avatar
                            key={member._id || member.id}
                            name={member.name}
                            avatar={member.avatar}
                            className="h-6 w-6 text-[8px] border-2 border-white dark:border-slate-900"
                          />
                        ))}
                        {members.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-500 dark:text-slate-400">
                            +{members.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {members.length} {members.length === 1 ? 'Member' : 'Members'}
                      </span>
                    </div>

                    {/* Due Date */}
                    {stats.nearestDueDate ? (
                      <span className={`flex items-center gap-1 text-[10px] font-semibold ${
                        stats.nearestDueDate < todayStr
                          ? 'text-rose-500 dark:text-rose-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        <span>
                          {stats.nearestDueDate < todayStr ? 'Overdue' : 'Due'}{' '}
                          {new Date(stats.nearestDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        <Calendar className="h-3 w-3" />
                        <span>No deadline</span>
                      </span>
                    )}
                  </div>

                  {/* Progress with enhanced info */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-505 dark:text-slate-400 mb-2">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">
                        {stats.completed} / {stats.total} Tasks Completed
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{stats.rate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out" 
                        style={{ 
                          width: `${stats.rate}%`,
                          backgroundColor: stats.rate === 100 ? '#10b981' : (project.color || '#3b82f6')
                        }} 
                      />
                    </div>
                  </div>

                  {/* Mini stats row */}
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100/60 dark:border-slate-800/60 rounded-md py-1.5 px-1">
                      <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Todo</span>
                      <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">{stats.todo}</span>
                    </div>
                    <div className="bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100/60 dark:border-slate-800/60 rounded-md py-1.5 px-1">
                      <span className="block text-[8px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Active</span>
                      <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">{stats.inProgress}</span>
                    </div>
                    <div className="bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100/60 dark:border-slate-800/60 rounded-md py-1.5 px-1">
                      <span className="block text-[8px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">Review</span>
                      <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">{stats.review}</span>
                    </div>
                    <div className="bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100/60 dark:border-slate-800/60 rounded-md py-1.5 px-1">
                      <span className="block text-[8px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Done</span>
                      <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">{stats.completed}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Premium Create Project Modal */}
      <CreateProjectModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default Projects;
