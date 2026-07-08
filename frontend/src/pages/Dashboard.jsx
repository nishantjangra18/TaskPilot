import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  Percent, 
  ArrowRight,
  Calendar,
  UserCheck,
  UserPlus,
  UserMinus,
  Search,
  AlertCircle,
  Award,
  TrendingUp,
  Users,
  Bell,
  Hand
} from 'lucide-react';

// Helper function to get pending tasks sorted appropriately
export const getPendingTasks = (tasksList) => {
  if (!tasksList) return [];
  const pendingStatuses = ['todo', 'in_progress', 'review'];
  
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayString();

  return tasksList
    .filter(t => {
      if (!t.status) return false;
      const statusNormalized = t.status.toLowerCase().replace(' ', '_');
      return pendingStatuses.includes(statusNormalized);
    })
    .sort((a, b) => {
      // Show overdue tasks first
      const isOverdueA = a.dueDate && a.dueDate < todayStr;
      const isOverdueB = b.dueDate && b.dueDate < todayStr;

      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;

      // Sort by priority: High, Medium, Low
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const pA = priorityWeight[a.priority?.toLowerCase()] || 0;
      const pB = priorityWeight[b.priority?.toLowerCase()] || 0;

      if (pA !== pB) {
        return pB - pA;
      }

      // Within same priority, sort by nearest due date
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dateA - dateB;
    });
};

const Dashboard = () => {
  const { 
    currentUser, 
    projects, 
    tasks, 
    users, 
    activityLogs,
    pendingInvitations,
    dbNotifications,
    acceptInvitation,
    rejectInvitation,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // States
  const [searchVal, setSearchVal] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const notificationsRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    if (location.state?.openNotifications) {
      setShowNotifications(true);
    }

    if (location.state?.scrollToInvitations || location.hash === '#pending-invitations') {
      window.setTimeout(() => {
        document.getElementById('pending-invitations')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [location.hash, location.state]);

  // Position calculation for notification dropdown portal
  useEffect(() => {
    if (showNotifications && bellRef.current) {
      const updatePosition = () => {
        const rect = bellRef.current.getBoundingClientRect();
        const dropdownWidth = 320; // width of notification box (w-80)
        let leftCoords = rect.right + window.scrollX - dropdownWidth;
        if (leftCoords < 16) {
          leftCoords = 16;
        }
        if (leftCoords + dropdownWidth > window.innerWidth + window.scrollX - 16) {
          leftCoords = window.innerWidth + window.scrollX - dropdownWidth - 16;
        }
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: leftCoords
        });
      };
      
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [showNotifications]);

  // Click outside to close notification panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationsRef.current && 
        !notificationsRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Helper date string
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayString();

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Personal task metrics
  const myAssignedTasks = useMemo(() => {
    return tasks.filter(t => (t.assigneeId || (t.assignee && (t.assignee._id || t.assignee))) === currentUser?.id);
  }, [tasks, currentUser]);

  const myPendingTasks = useMemo(() => {
    return getPendingTasks(myAssignedTasks);
  }, [myAssignedTasks]);

  const myCompletedTasks = useMemo(() => {
    return tasks.filter(t => (t.assigneeId || (t.assignee && (t.assignee._id || t.assignee))) === currentUser?.id && t.status === 'done');
  }, [tasks, currentUser]);

  const myOverdueTasks = useMemo(() => {
    return myPendingTasks.filter(t => t.dueDate && t.dueDate < todayStr);
  }, [myPendingTasks, todayStr]);

  const myDueThisWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    endOfWeek.setHours(23,59,59,999);
    return myPendingTasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due >= today && due <= endOfWeek;
    });
  }, [myPendingTasks]);

  const myUpcomingTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return myPendingTasks.filter(t => {
      if (!t.dueDate) return true;
      const due = new Date(t.dueDate);
      return due > endOfWeek;
    });
  }, [myPendingTasks]);

  const completionRate = myAssignedTasks.length > 0 
    ? Math.round((myCompletedTasks.length / myAssignedTasks.length) * 100) 
    : 0;

  // Overdue task alert in welcome banner
  const firstOverdueTask = useMemo(() => {
    return myOverdueTasks.length > 0 ? myOverdueTasks[0] : null;
  }, [myOverdueTasks]);

  // Global search calculations
  const searchResults = useMemo(() => {
    const query = searchVal.trim().toLowerCase();
    if (query.length < 3) return null;

    const accessibleProjectIds = new Set(projects.map(p => (p._id || p.id)?.toString()).filter(Boolean));
    const sharedMemberIds = new Set();
    projects.forEach(project => {
      const ownerId = project.owner?._id || project.owner || project.ownerId;
      if (ownerId) sharedMemberIds.add(ownerId.toString());
      (project.members || []).forEach(member => {
        const memberId = member._id || member.id || member;
        if (memberId) sharedMemberIds.add(memberId.toString());
      });
    });

    const matchedProjects = projects.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.description || '').toLowerCase().includes(query)
    );

    const matchedTasks = tasks.filter(t => {
      const taskProjectId = (t.projectId?._id || t.projectId)?.toString();
      if (taskProjectId && !accessibleProjectIds.has(taskProjectId)) return false;
      return t.title.toLowerCase().includes(query) || 
        (t.description || '').toLowerCase().includes(query);
    });

    const matchedMembers = users.filter(u => {
      const userId = (u._id || u.id)?.toString();
      if (!userId || !sharedMemberIds.has(userId)) return false;
      return u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query) ||
        (u.title || '').toLowerCase().includes(query);
    });

    return {
      projects: matchedProjects.slice(0, 3),
      tasks: matchedTasks.slice(0, 5),
      members: matchedMembers.slice(0, 3),
      hasResults: matchedProjects.length > 0 || matchedTasks.length > 0 || matchedMembers.length > 0
    };
  }, [searchVal, projects, tasks, users]);

  // Flattened results for keyboard navigation
  const flatResults = useMemo(() => {
    if (!searchResults) return [];
    const arr = [];
    searchResults.projects.forEach(p => {
      const pId = p._id || p.id;
      if (pId) {
        arr.push({ type: 'project', id: pId, name: p.name, link: `/projects/${pId}` });
      }
    });
    searchResults.tasks.forEach(t => {
      const tId = t._id || t.id;
      if (tId && t.projectId) {
        arr.push({ type: 'task', id: tId, name: t.title, link: `/projects/${t.projectId}`, projectId: t.projectId });
      }
    });
    searchResults.members.forEach(u => {
      const uId = u._id || u.id;
      if (uId) {
        arr.push({ type: 'member', id: uId, name: u.name, title: u.title, avatar: u.avatar });
      }
    });
    return arr;
  }, [searchResults]);

  const triggerNavigation = (item) => {
    setSearchVal('');
    setSelectedIndex(-1);
    if (item.type === 'project') {
      navigate(item.link);
    } else if (item.type === 'task') {
      navigate(`/projects/${item.projectId}/tasks/${item.id}`);
    }
  };

  const handleSearchChange = (e) => {
    setSearchVal(e.target.value);
    setSelectedIndex(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (flatResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < flatResults.length) {
        triggerNavigation(flatResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setSearchVal('');
      setSelectedIndex(-1);
    }
  };

  // Count unread database notifications
  const unreadNotificationsCount = useMemo(() => {
    if (!dbNotifications) return 0;
    return dbNotifications.filter(n => !n.isRead).length;
  }, [dbNotifications]);

  // Dynamically generated notification alerts
  const notifications = useMemo(() => {
    const list = [];
    
    // 1. Overdue tasks notifications
    myPendingTasks.forEach(task => {
      const isOverdue = task.dueDate && task.dueDate < todayStr;
      const tId = task._id || task.id;
      if (isOverdue && tId && task.projectId) {
        list.push({
          id: `notif-overdue-${tId}`,
          type: 'overdue',
          title: 'Task Overdue',
          message: `"${task.title}" was due on ${task.dueDate}.`,
          timestamp: task.dueDate,
          link: `/projects/${task.projectId}`,
          taskId: tId,
          projectId: task.projectId,
          urgent: true
        });
      }
    });

    // 2. Tasks due today
    myPendingTasks.forEach(task => {
      const tId = task._id || task.id;
      if (task.dueDate === todayStr && tId && task.projectId) {
        list.push({
          id: `notif-due-today-${tId}`,
          type: 'due_today',
          title: 'Due Today',
          message: `"${task.title}" is due today.`,
          timestamp: task.dueDate,
          link: `/projects/${task.projectId}`,
          taskId: tId,
          projectId: task.projectId,
          urgent: true
        });
      }
    });

    // 3. Recent project activity logs
    const userProjectIds = projects.map(p => p._id || p.id).filter(Boolean);
    const relevantLogs = activityLogs
      .filter(log => log.projectId && userProjectIds.includes(log.projectId) && (log.userId?._id || log.userId) !== currentUser?.id)
      .slice(0, 5);

    relevantLogs.forEach(log => {
      const logUserId = log.userId?._id || log.userId;
      const logUser = users.find(u => (u._id || u.id) === logUserId) || log.userId;
      if (log.projectId) {
        list.push({
          id: `notif-activity-${log._id || log.id}`,
          type: 'activity',
          title: 'Workspace Update',
          message: `${logUser?.name || 'Someone'} ${log.message}`,
          timestamp: log.createdAt,
          link: `/projects/${log.projectId}`,
          userId: logUserId
        });
      }
    });

    // Sort by urgent first, then by timestamp (newest first)
    return list.sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [myPendingTasks, projects, activityLogs, currentUser, todayStr, users]);

  // Scoped Team Performance Calculations
  const teamPerformance = useMemo(() => {
    if (!currentUser || projects.length === 0) {
      return { showEmpty: true, mvp: null, contributorsCount: 0 };
    }

    const memberIds = new Set();
    projects.forEach(p => {
      (p.members || []).forEach(m => {
        const mId = m._id || m;
        if (mId) memberIds.add(mId.toString());
      });
    });

    if (memberIds.size === 0) {
      return { showEmpty: true, mvp: null, contributorsCount: 0 };
    }

    const projectIds = projects.map(p => p._id || p.id);
    const relevantTasks = tasks.filter(t => projectIds.includes(t.projectId));
    const completedTasks = relevantTasks.filter(t => t.status === 'done');

    if (completedTasks.length === 0) {
      return { showEmpty: true, mvp: null, contributorsCount: memberIds.size };
    }

    const memberStats = Array.from(memberIds).map(mId => {
      // Find user from populated project members first, then fallback to users array
      let u = null;
      for (const p of projects) {
        const found = (p.members || []).find(m => (m._id || m) === mId);
        if (found && typeof found === 'object') {
          u = found;
          break;
        }
      }
      if (!u) {
        u = users.find(user => (user._id || user.id) === mId);
      }
      const count = completedTasks.filter(t => {
        const tAssigneeId = t.assigneeId || (t.assignee && (t.assignee._id || t.assignee));
        return tAssigneeId === mId;
      }).length;
      return { user: u, count };
    }).filter(s => s.user && s.count > 0);

    if (memberStats.length === 0) {
      return { showEmpty: true, mvp: null, contributorsCount: memberIds.size };
    }

    memberStats.sort((a, b) => b.count - a.count);
    return {
      showEmpty: false,
      mvp: memberStats[0],
      contributorsCount: memberIds.size
    };
  }, [projects, tasks, users, currentUser]);

  // Weekly Activity Calculations
  const tasksCreatedThisWeekCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return tasks.filter(t => new Date(t.createdAt).getTime() >= sevenDaysAgo).length;
  }, [tasks]);

  const tasksCompletedThisWeekCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return activityLogs.filter(log => 
      (log.message.toLowerCase().includes('completed') || log.message.toLowerCase().includes('done')) &&
      new Date(log.createdAt).getTime() >= sevenDaysAgo
    ).length;
  }, [activityLogs]);

  // Sparkline data calculation (7 days trend)
  const dailySparklineData = useMemo(() => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
      
      const count = activityLogs.filter(log => 
        (log.message.toLowerCase().includes('completed') || log.message.toLowerCase().includes('done')) &&
        new Date(log.createdAt).getTime() >= dayStart &&
        new Date(log.createdAt).getTime() <= dayEnd
      ).length;
      
      data.push({ label, count });
    }
    return data;
  }, [activityLogs]);

  // Generated sparkline coordinates
  const sparklinePath = useMemo(() => {
    if (dailySparklineData.length === 0) return '';
    const maxVal = Math.max(...dailySparklineData.map(d => d.count), 2);
    const padding = 10;
    const chartWidth = 245;
    const chartHeight = 40;
    
    const points = dailySparklineData.map((d, index) => {
      const x = padding + (index / (dailySparklineData.length - 1)) * chartWidth;
      const y = padding + chartHeight - (d.count / maxVal) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }, [dailySparklineData]);

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return 'bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-450 border border-rose-100/60 dark:border-rose-900/50 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider w-fit block';
      case 'medium': return 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-450 border border-amber-100/60 dark:border-amber-900/50 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider w-fit block';
      default: return 'bg-slate-50 dark:bg-slate-800/40 text-slate-550 dark:text-slate-400 border border-slate-150/60 dark:border-slate-700/50 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider w-fit block';
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Global tracker for search results indexes
  let globalItemIdx = 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-6xl mx-auto">
      
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-colors text-left relative z-10">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-violet-600 dark:text-[#C4B5FD] uppercase tracking-wider bg-violet-50/60 dark:bg-[rgba(139,92,246,0.18)] px-2.5 py-1 rounded-full">{formattedDate}</span>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight pt-1">
            {getGreeting()}, {currentUser?.name || 'User'}
            <Hand className="h-5 w-5 text-amber-500 inline-block align-text-bottom ml-1.5 animate-bounce" />
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">
            You have <strong className="text-slate-700 dark:text-slate-350 font-bold">{myPendingTasks.length} pending tasks</strong>.
          </p>
          {firstOverdueTask && (
            <div className="inline-flex items-center space-x-1.5 text-[11px] font-semibold bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 px-3 py-1 rounded-lg mt-1 select-none">
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
              <span>"{firstOverdueTask.title}" is overdue.</span>
            </div>
          )}
        </div>

        {/* Search & Notifications wrapper */}
        <div className="flex items-center space-x-2.5 w-full max-w-xs md:max-w-md shrink-0">
          
          {/* Global Dashboard Search */}
          <div className="relative flex-1 z-[9999]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search projects, tasks, members..."
                value={searchVal}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500 dark:focus:border-violet-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors"
              />
              {searchVal && (
                <button 
                  onClick={() => { setSearchVal(''); setSelectedIndex(-1); }} 
                  className="absolute right-3 top-3 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Search Dropdown Popup with Keyboard Navigation */}
            {searchVal && searchResults && (
              <div
                style={{
                  opacity: 1,
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none'
                }}
                className="absolute left-0 right-0 mt-2 bg-[#FFFFFF] dark:bg-[#0F1117] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] z-[9999] max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-left transition-colors duration-200"
              >
                {!searchResults.hasResults ? (
                  <div className="p-4 text-center text-slate-450 dark:text-slate-500 text-xs">
                    No matches found for "{searchVal}"
                  </div>
                ) : (
                  <>
                    {searchResults.projects.length > 0 && (
                      <div className="p-3">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 px-1">Projects</span>
                        <div className="space-y-1">
                          {searchResults.projects.map(p => {
                            const currentIdx = globalItemIdx++;
                            const isActive = currentIdx === selectedIndex;
                            return (
                              <div
                                key={p._id || p.id}
                                onClick={() => triggerNavigation({ type: 'project', link: `/projects/${p._id || p.id}` })}
                                className={`flex items-center space-x-2 p-2 rounded-lg transition-colors text-xs font-semibold cursor-pointer ${
                                  isActive 
                                    ? 'bg-violet-50 dark:bg-violet-955 text-violet-600 dark:text-violet-400 border border-violet-100/30 dark:border-violet-900/30' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="truncate">{p.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {searchResults.tasks.length > 0 && (
                      <div className="p-3">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 px-1">Tasks</span>
                        <div className="space-y-1">
                          {searchResults.tasks.map(t => {
                            const currentIdx = globalItemIdx++;
                            const isActive = currentIdx === selectedIndex;
                            return (
                              <div
                                key={t._id || t.id}
                                onClick={() => triggerNavigation({ type: 'task', id: t._id || t.id, link: `/projects/${t.projectId}` })}
                                className={`flex flex-col p-2 rounded-lg transition-colors text-xs font-semibold cursor-pointer ${
                                  isActive 
                                    ? 'bg-violet-50 dark:bg-violet-955 text-violet-600 dark:text-violet-400 border border-violet-100/30 dark:border-violet-900/30' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <span>{t.title}</span>
                                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Press Enter to view project board</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {searchResults.members.length > 0 && (
                      <div className="p-3">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 px-1">Team Members</span>
                        <div className="space-y-2">
                          {searchResults.members.map(u => {
                            const currentIdx = globalItemIdx++;
                            const isActive = currentIdx === selectedIndex;
                            return (
                              <div
                                key={u._id || u.id}
                                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-lg transition-colors ${
                                  isActive 
                                    ? 'bg-violet-50 dark:bg-violet-955 border border-violet-100/30' 
                                    : ''
                                }`}
                              >
                                <Avatar name={u.name} avatar={u.avatar} className="h-6 w-6 text-[8px] border border-slate-100 dark:border-slate-800" />
                                <div className="flex flex-col leading-tight">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{u.name}</span>
                                  <span className="text-[9.5px] text-slate-400 dark:text-slate-500">{u.title} â€¢ {u.email}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Notification Bell Button & Dropdown */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-3 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown overlay */}
            {showNotifications && createPortal(
              <div>
                <div 
                  ref={notificationsRef}
                  style={{
                    position: 'absolute',
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    zIndex: 9998,
                    backdropFilter: 'none'
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl w-80 text-left transition-colors duration-200"
                >
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-xl">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">Notifications</span>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await markAllNotificationsAsRead();
                        }}
                        className="text-[9.5px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {dbNotifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 dark:text-slate-505 text-xs flex flex-col items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <span>All caught up! No notifications.</span>
                      </div>
                    ) : (
                      dbNotifications.map(n => (
                        <div 
                          key={n._id || n.id}
                          onClick={async () => {
                            if (!n.isRead) {
                              await markNotificationAsRead(n._id || n.id);
                            }
                            if (['connection_request_received', 'connection_accepted', 'connection_declined'].includes(n.type)) {
                              navigate('/network', {
                                state: {
                                  networkTab: 'requests',
                                  requestList: n.metadata?.requestList || 'incoming',
                                  connectionId: n.metadata?.connectionId,
                                },
                              });
                            }
                          }}
                          className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-xs flex items-start gap-3 ${!n.isRead ? 'bg-violet-50/10 dark:bg-violet-950/5 font-semibold' : ''}`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {n.type === 'invitation_received' && <UserPlus className="h-4 w-4 text-violet-500" />}
                            {n.type === 'invitation_accepted' && <UserCheck className="h-4 w-4 text-emerald-500" />}
                            {n.type === 'invitation_rejected' && <UserMinus className="h-4 w-4 text-rose-500" />}
                            {n.type === 'connection_request_received' && <UserPlus className="h-4 w-4 text-violet-500" />}
                            {n.type === 'connection_accepted' && <UserCheck className="h-4 w-4 text-emerald-500" />}
                            {n.type === 'connection_declined' && <UserMinus className="h-4 w-4 text-rose-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-700 dark:text-slate-200 leading-snug break-words">{n.message}</p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-505 mt-1 block">
                              {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!n.isRead && (
                            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <div id="pending-invitations" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-6 rounded-2xl shadow-2xs transition-colors duration-150 text-left w-full">
          <div className="flex items-center justify-between mb-5 border-b border-slate-50 dark:border-slate-800/80 pb-3.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Pending Team Invitations</h2>
            <span className="text-[10px] font-bold text-violet-600 dark:text-[#C4B5FD] bg-violet-50/60 dark:bg-[rgba(139,92,246,0.18)] px-2.5 py-1 rounded-full uppercase tracking-wider">
              {pendingInvitations.length} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingInvitations.map((inv) => (
              <div 
                key={inv._id || inv.id}
                className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl flex flex-col justify-between hover:border-violet-500/20 hover:shadow-2xs transition-all duration-200"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {inv.projectName}
                    </h3>
                    <span className="text-[9px] text-slate-400 dark:text-slate-505 font-bold uppercase">Project</span>
                  </div>
                  <p className="text-xs text-slate-550 dark:text-slate-400">
                    Invited by <strong className="text-slate-700 dark:text-slate-200 font-semibold">{inv.senderName}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Received on {new Date(inv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={async () => {
                      try {
                        await acceptInvitation(inv._id || inv.id);
                      } catch (err) {
                        alert(err.message || 'Failed to accept invitation');
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs hover:shadow-xs active:scale-97 transition-all cursor-pointer text-center"
                  >
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await rejectInvitation(inv._id || inv.id);
                      } catch (err) {
                        alert(err.message || 'Failed to reject invitation');
                      }
                    }}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-750 dark:hover:text-white rounded-lg text-xs font-bold active:scale-97 transition-all cursor-pointer text-center"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Active Projects */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[20px] min-h-[140px] border border-slate-100 dark:border-slate-800 shadow-2xs flex flex-col justify-between text-left transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Active Projects</span>
            <div className="p-2.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl border border-violet-500/10">
              <FolderKanban className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5">
            <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{projects.length}</span>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Active workspaces</div>
          </div>
        </div>

        {/* My Pending Tasks */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[20px] min-h-[140px] border border-slate-100 dark:border-slate-800 shadow-2xs flex flex-col justify-between text-left transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Pending Tasks</span>
            <div className="p-2.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl border border-violet-500/10">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5">
            <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{myPendingTasks.length}</span>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Assigned to you</div>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[20px] min-h-[140px] border border-slate-100 dark:border-slate-800 shadow-2xs flex flex-col justify-between text-left transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Overdue Tasks</span>
            <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/10">
              <AlertCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5">
            <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">{myOverdueTasks.length}</span>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Action required</div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[20px] min-h-[140px] border border-slate-100 dark:border-slate-800 shadow-2xs flex flex-col justify-between text-left transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Completed Tasks</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/10">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5">
            <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{myCompletedTasks.length}</span>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Completed this cycle</div>
          </div>
        </div>
      </div>

      {/* Reports & Insights Row (4 compact cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Productivity Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-2xs text-left transition-all flex flex-col justify-between">
          <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
            <Percent className="h-3.5 w-3.5 text-violet-500" />
            <span>Productivity</span>
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="h-14 w-14 transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  className="stroke-slate-100 dark:stroke-slate-800/40 fill-transparent"
                  strokeWidth="4"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  className="stroke-violet-500 dark:stroke-violet-500 fill-transparent transition-all duration-300 ease-out"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 - (completionRate / 100) * (2 * Math.PI * 22)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-extrabold text-slate-900 dark:text-white">{completionRate}%</span>
              </div>
            </div>
            
            <div className="text-left space-y-0.5 text-xs flex-1 ml-4">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-400">Done</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{myCompletedTasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-400">Pending</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{myPendingTasks.length}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/80 pt-1 mt-1 text-[10.5px]">
                <span className="text-slate-550 dark:text-slate-400 font-semibold">Total</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{myAssignedTasks.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deadlines Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-2xs text-left transition-all flex flex-col justify-between">
          <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
            <Calendar className="h-3.5 w-3.5 text-rose-500" />
            <span>Deadlines</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-rose-500/10 px-2.5 py-1.5 rounded-xl border border-rose-500/10">
              <span className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Overdue</span>
              <span className="font-bold text-rose-700 dark:text-rose-350">{myOverdueTasks.length}</span>
            </div>
            <div className="flex items-center justify-between bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/10">
              <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Due 7d</span>
              <span className="font-bold text-amber-700 dark:text-amber-350">{myDueThisWeek.length}</span>
            </div>
            <div className="flex items-center justify-between bg-violet-500/10 px-2.5 py-1.5 rounded-xl border border-violet-500/10">
              <span className="text-[9.5px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Upcoming</span>
              <span className="font-bold text-violet-700 dark:text-violet-350">{myUpcomingTasks.length}</span>
            </div>
          </div>
        </div>

        {/* Team Performance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-2xs text-left transition-all flex flex-col justify-between">
          <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span>Team Status</span>
          </h3>
          {teamPerformance.showEmpty ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 dark:text-slate-500">
              <span className="text-xs font-semibold">No team activity yet</span>
            </div>
          ) : (
            <>
              {teamPerformance.mvp && (
                <div className="flex items-center space-x-2 bg-slate-50/60 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800/80 rounded-xl mb-2">
                  <Avatar 
                    name={teamPerformance.mvp.user.name} 
                    avatar={teamPerformance.mvp.user.avatar} 
                    className="h-7 w-7 text-[9px] border border-slate-150 dark:border-slate-800" 
                  />
                  <div className="min-w-0 leading-tight">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">MVP</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block mt-0.5">{teamPerformance.mvp.user.name}</span>
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">{teamPerformance.mvp.count} completed</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 dark:text-slate-400 flex items-center space-x-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>Contributors</span>
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">{teamPerformance.contributorsCount}</span>
              </div>
            </>
          )}
        </div>

        {/* Weekly Activity Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-2xs text-left transition-all flex flex-col justify-between">
          <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span>Weekly Velocity</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-1.5">
              <span className="text-[8.5px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Created</span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mt-0.5">{tasksCreatedThisWeekCount}</span>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-1.5">
              <span className="text-[8.5px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Done</span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mt-0.5">{tasksCompletedThisWeekCount}</span>
            </div>
          </div>
          
          {/* Compact Sparkline path */}
          <div className="bg-slate-50/20 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl p-1 mt-2">
            <svg className="w-full h-8" viewBox="0 0 260 50">
              <defs>
                <linearGradient id="sparklineGradCompact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {sparklinePath && (
                <path
                  d={`${sparklinePath} L 255,45 L 5,45 Z`}
                  fill="url(#sparklineGradCompact)"
                />
              )}
              {sparklinePath && (
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
        </div>

      </div>

      {/* My Pending Tasks (Full Width, Polish Layout) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-6 rounded-2xl shadow-2xs transition-colors duration-150 text-left w-full">
        <div className="flex items-center justify-between mb-5 border-b border-slate-50 dark:border-slate-800/80 pb-3.5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">My Pending Tasks</h2>
          <div className="flex items-center space-x-1.5 text-slate-400 dark:text-slate-400">
            <UserCheck className="h-4.5 w-4.5 text-slate-400" />
            <span className="text-xs font-semibold">{myPendingTasks.length} tasks assigned</span>
          </div>
        </div>

        {myPendingTasks.length === 0 ? (
          <div className="text-center py-16 text-slate-450 flex flex-col items-center justify-center">
            <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 rounded-full mb-4 animate-bounce duration-1000">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">All Caught Up!</h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1.5 max-w-xs mx-auto">
              You have no pending tasks assigned.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {myPendingTasks.slice(0, 5).map((task) => {
              const taskId = task._id || task.id;
              const project = projects.find(p => (p._id || p.id) === task.projectId);
              const isOverdue = task.dueDate && task.dueDate < todayStr;
              
              return (
                <div 
                  key={taskId} 
                  onClick={() => navigate(`/projects/${task.projectId}/tasks/${taskId}`)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-150 cursor-pointer group text-xs md:text-sm gap-3 ${
                    isOverdue 
                      ? 'border-rose-100 dark:border-rose-950/60 bg-rose-50/10 dark:bg-rose-955/5 border-l-4 border-l-rose-500 hover:border-rose-200 dark:hover:border-rose-800' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-2xs'
                  }`}
                >
                  {/* Left: Task Title + Project Capsule */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-400 transition-colors truncate text-sm">
                        {task.title}
                      </h4>
                      {project && (
                        <span 
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md mt-1.5 inline-block" 
                          style={{ 
                            backgroundColor: `${project.color}15`, 
                            color: project.color 
                          }}
                        >
                          {project.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Badges and Details */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 shrink-0 sm:self-center">
                    {isOverdue && (
                      <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Overdue
                      </span>
                    )}
                    
                    <span className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </span>
 
                    <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border flex items-center space-x-1.5 ${
                      task.status === 'in_progress' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/50' :
                      task.status === 'review' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50' :
                      'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/60'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        task.status === 'in_progress' ? 'bg-violet-500' :
                        task.status === 'review' ? 'bg-amber-500' :
                        'bg-slate-400 dark:bg-slate-500'
                      }`} />
                      <span>
                        {task.status === 'todo' ? 'To Do' : task.status === 'in_progress' ? 'In Progress' : task.status === 'review' ? 'Review' : task.status}
                      </span>
                    </span>

                    <span className={`text-[10px] font-bold flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border ${
                      isOverdue 
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40' 
                        : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                    }`}>
                      <Calendar className={`h-3.5 w-3.5 ${isOverdue ? 'text-rose-500' : 'text-slate-400 dark:text-slate-400'}`} />
                      <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'No date'}</span>
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="mt-4 pt-3.5 border-t border-slate-50 dark:border-slate-800 flex justify-center">
              <Link to="/projects" className="text-xs font-bold text-violet-600 hover:text-violet-750 flex items-center space-x-1 transition-colors">
                <span>View All Tasks</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;





