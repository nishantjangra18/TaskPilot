import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

const AppContext = createContext();

const API_URL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

export const AppProvider = ({ children }) => {
  const { user, token, isAuthenticated, updateProfile: authUpdateProfile } = useAuth();

  // Derive currentUser from auth
  const currentUser = user ? { ...user, id: user._id, title: user.title || '' } : null;

  // Core state â€” starts empty, populated from API
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [dbNotifications, setDbNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeMeetings, setActiveMeetings] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [networkConnections, setNetworkConnections] = useState([]);
  const [incomingConnectionRequests, setIncomingConnectionRequests] = useState([]);
  const [outgoingConnectionRequests, setOutgoingConnectionRequests] = useState([]);
  const [networkSuggestions, setNetworkSuggestions] = useState([]);
  const [latestNotification, setLatestNotification] = useState(null);
  const [latestInvitation, setLatestInvitation] = useState(null);
  const [latestMeetingEvent, setLatestMeetingEvent] = useState(null);
  const [latestTaskEvent, setLatestTaskEvent] = useState(null);
  const [activeMessageConversationId, setActiveMessageConversationId] = useState(null);
  const [latestChatMessage, setLatestChatMessage] = useState(null);
  const [latestChatUpdate, setLatestChatUpdate] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Helper for authenticated API calls
  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const headers = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API request failed');
    return data;
  }, [token]);

  // Fetch all workspace data from backend
  const refreshData = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setDataLoading(true);
    try {
      const [projectsRes, tasksRes, logsRes, usersRes, invitationsRes, notificationsRes, chatsRes, activeMeetingsRes, meetingsRes, networkRes, suggestionsRes] = await Promise.all([
        apiFetch('/projects'),
        apiFetch('/tasks'),
        apiFetch('/projects/logs'),
        apiFetch('/auth/users'),
        apiFetch('/invitations/pending'),
        apiFetch('/notifications'),
        apiFetch('/chats'),
        apiFetch('/meetings/active'),
        apiFetch('/meetings'),
        apiFetch('/network'),
        apiFetch('/network/suggestions'),
      ]);
      setProjects(projectsRes.data || []);
      setTasks(tasksRes.data || []);
      setActivityLogs(logsRes.data || []);
      setUsers(usersRes.data || []);
      setPendingInvitations(invitationsRes.data || []);
      setDbNotifications(notificationsRes.data || []);
      setConversations(chatsRes.data || []);
      setActiveMeetings(activeMeetingsRes.data || []);
      setMeetings(meetingsRes.data || []);
      setNetworkConnections(networkRes.data?.connections || []);
      setIncomingConnectionRequests(networkRes.data?.incoming || []);
      setOutgoingConnectionRequests(networkRes.data?.outgoing || []);
      setNetworkSuggestions(suggestionsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch workspace data:', err);
    }
    setDataLoading(false);
  }, [token, isAuthenticated, apiFetch]);

  // Fetch data when auth state changes
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshData();
    } else {
      // Clear state on logout
      setProjects([]);
      setTasks([]);
      setActivityLogs([]);
      setUsers([]);
      setPendingInvitations([]);
      setDbNotifications([]);
      setConversations([]);
      setActiveMeetings([]);
      setMeetings([]);
      setNetworkConnections([]);
      setIncomingConnectionRequests([]);
      setOutgoingConnectionRequests([]);
      setNetworkSuggestions([]);
        setLatestNotification(null);
        setLatestInvitation(null);
        setLatestMeetingEvent(null);
        setLatestTaskEvent(null);
        setActiveMessageConversationId(null);
      setLatestChatMessage(null);
      setLatestChatUpdate(null);
    }
  }, [isAuthenticated, token, refreshData]);

  // Set up real-time Socket.IO connections
  useEffect(() => {
    let socket;
    if (isAuthenticated && token && currentUser) {
      // Connect to Socket.io backend server
      const socketUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
      socket = io(socketUrl);

      socket.on('connect', () => {
        console.log('Socket.io connected:', socket.id);
        socket.emit('join_room', currentUser.id);
      });

      socket.on('invitation_received', (invitation) => {
        console.log('Socket event: invitation_received', invitation);
        setPendingInvitations(prev => {
          if (prev.some(inv => inv._id === invitation._id)) return prev;
          return [invitation, ...prev];
        });
        setLatestInvitation({ invitation, receivedAt: Date.now() });
      });

      socket.on('notification_received', (notification) => {
        console.log('Socket event: notification_received', notification);
        setDbNotifications(prev => {
          if (prev.some(n => n._id === notification._id)) return prev;
          return [notification, ...prev];
        });
        setLatestNotification({ notification, receivedAt: Date.now() });
        if (['connection_request_received', 'connection_accepted', 'connection_declined'].includes(notification.type)) {
          refreshNetwork();
        }
      });

      socket.on('member_list_updated', ({ projectId }) => {
        console.log('Socket event: member_list_updated', projectId);
        refreshData();
      });
      socket.on('chat_message', (payload) => {
        console.log('Socket event: chat_message', payload);
        setLatestChatMessage({ ...payload, receivedAt: Date.now() });
      });

      socket.on('chat_updated', (conversation) => {
        console.log('Socket event: chat_updated', conversation);
        setLatestChatUpdate({ conversation, receivedAt: Date.now() });
        setConversations(prev => {
          const exists = prev.some(item => item._id === conversation._id);
          const next = exists ? prev.map(item => item._id === conversation._id ? { ...item, ...conversation, unreadCount: conversation.unreadCount ?? item.unreadCount } : item) : [conversation, ...prev];
          return next.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        });
      });

      socket.on('invitation_updated', (invitation) => {
        console.log('Socket event: invitation_updated', invitation);
        setPendingInvitations(prev => prev.filter(inv => inv._id !== invitation._id));
        setLatestInvitation({ invitation, receivedAt: Date.now() });
      });

      socket.on('network_updated', () => {
        console.log('Socket event: network_updated');
        refreshNetwork();
        refreshData();
      });
      socket.on('meeting_started', (meeting) => {
        console.log('Socket event: meeting_started', meeting);
        setActiveMeetings(prev => {
          const exists = prev.some(item => item._id === meeting._id);
          return exists ? prev.map(item => item._id === meeting._id ? meeting : item) : [meeting, ...prev];
        });
        setMeetings(prev => {
          if (meeting.provider !== 'scheduled') return prev;
          const exists = prev.some(item => item._id === meeting._id);
          return exists ? prev.map(item => item._id === meeting._id ? meeting : item) : [meeting, ...prev];
        });
        setLatestMeetingEvent({ type: 'meeting_started', meeting, receivedAt: Date.now() });
      });

      socket.on('meeting_updated', (meeting) => {
        console.log('Socket event: meeting_updated', meeting);
        setActiveMeetings(prev => {
          const isLive = ['live', 'active'].includes(meeting.status);
          const exists = prev.some(item => item._id === meeting._id);
          if (!isLive) return prev.filter(item => item._id !== meeting._id);
          return exists ? prev.map(item => item._id === meeting._id ? meeting : item) : [meeting, ...prev];
        });
        setMeetings(prev => {
          if (meeting.provider !== 'scheduled') return prev;
          const exists = prev.some(item => item._id === meeting._id);
          return exists ? prev.map(item => item._id === meeting._id ? meeting : item) : [meeting, ...prev];
        });
      });

      socket.on('meeting_participant_joined', (payload) => {
        console.log('Socket event: meeting_participant_joined', payload);
        setActiveMeetings(prev => prev.map(item => item._id === payload._id ? payload : item));
        setMeetings(prev => payload.provider === 'scheduled' ? prev.map(item => item._id === payload._id ? payload : item) : prev);
        if (payload.actor?.id !== currentUser.id) {
          setLatestMeetingEvent({ type: 'participant_joined', meeting: payload, actor: payload.actor, receivedAt: Date.now() });
        }
      });

      socket.on('meeting_participant_left', (payload) => {
        console.log('Socket event: meeting_participant_left', payload);
        setActiveMeetings(prev => prev.map(item => item._id === payload._id ? payload : item));
        setMeetings(prev => payload.provider === 'scheduled' ? prev.map(item => item._id === payload._id ? payload : item) : prev);
        if (payload.actor?.id !== currentUser.id) {
          setLatestMeetingEvent({ type: 'participant_left', meeting: payload, actor: payload.actor, receivedAt: Date.now() });
        }
      });

      socket.on('meeting_scheduled', (meeting) => {
        console.log('Socket event: meeting_scheduled', meeting);
        setMeetings(prev => {
          const exists = prev.some(item => item._id === meeting._id);
          return exists ? prev.map(item => item._id === meeting._id ? meeting : item) : [meeting, ...prev];
        });
        setLatestMeetingEvent({ type: 'meeting_scheduled', meeting, receivedAt: Date.now() });
      });

      socket.on('meeting_cancelled', (meeting) => {
        console.log('Socket event: meeting_cancelled', meeting);
        setActiveMeetings(prev => prev.filter(item => item._id !== meeting._id));
        setMeetings(prev => prev.map(item => item._id === meeting._id ? meeting : item));
        setLatestMeetingEvent({ type: 'meeting_cancelled', meeting, receivedAt: Date.now() });
      });
      socket.on('task_notification', (payload) => {
        console.log('Socket event: task_notification', payload);
        setLatestTaskEvent({ ...payload, receivedAt: Date.now() });
        refreshData();
      });

      socket.on('meeting_ended', (meeting) => {
        console.log('Socket event: meeting_ended', meeting);
        setActiveMeetings(prev => prev.filter(item => item._id !== meeting._id));
        setMeetings(prev => prev.map(item => item._id === meeting._id ? meeting : item));
        setLatestMeetingEvent({ type: 'meeting_ended', meeting, receivedAt: Date.now() });
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated, token, currentUser?.id, refreshData]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Profile
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const updateProfile = async (updates) => {
    if (authUpdateProfile) {
      return await authUpdateProfile(updates);
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Projects CRUD
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const addProject = async (projectData) => {
    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projectData.name,
          description: projectData.description || '',
          theme: projectData.color || '#3b82f6',
          icon: projectData.icon || 'folder',
          priority: projectData.priority || 'medium',
          deadline: projectData.deadline || null,
          visibility: projectData.visibility || 'private',
          members: projectData.members || [],
        }),
      });
      await refreshData();
      return { ...res.data, id: res.data._id };
    } catch (err) {
      console.error('Failed to create project:', err);
      return null;
    }
  };

  const editProject = async (projectId, updates) => {
    try {
      await apiFetch(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
      await refreshData();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const addMemberToProject = async (projectId, memberId) => {
    try {
      const project = projects.find(p => (p._id || p.id) === projectId);
      if (!project) return;
      const currentMembers = (project.members || []).map(m => m._id || m);
      if (!currentMembers.includes(memberId)) {
        await apiFetch(`/projects/${projectId}`, {
          method: 'PUT',
          body: JSON.stringify({ members: [...currentMembers, memberId] }),
        });
        await refreshData();
      }
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const removeMemberFromProject = async (projectId, memberId) => {
    try {
      const project = projects.find(p => (p._id || p.id) === projectId);
      if (!project) return;
      const currentMembers = (project.members || []).map(m => m._id || m);
      await apiFetch(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({ members: currentMembers.filter(m => m !== memberId) }),
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Tasks CRUD
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const addTask = async (projectId, taskData) => {
    try {
      const res = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          title: taskData.title,
          description: taskData.description || '',
          status: taskData.status || 'todo',
          priority: taskData.priority || 'medium',
          dueDate: taskData.dueDate || null,
          dueTime: taskData.dueTime || null,
          taskType: taskData.type || 'feature',
          assignee: taskData.assigneeId || null,
        }),
      });
      await refreshData();
      return { ...res.data, id: res.data._id };
    } catch (err) {
      console.error('Failed to create task:', err);
      return null;
    }
  };

  const editTask = async (taskId, updates) => {
    try {
      // Map frontend field names to backend field names
      const backendUpdates = { ...updates };
      if (updates.assigneeId !== undefined) {
        backendUpdates.assignee = updates.assigneeId;
        delete backendUpdates.assigneeId;
      }
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(backendUpdates),
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
      await refreshData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const toggleTaskStatus = async (taskId) => {
    const task = tasks.find(t => (t._id || t.id) === taskId);
    if (!task) return;
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    await editTask(taskId, { status: nextStatus });
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Activity Log (read-only from backend, no localStorage)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const logActivity = () => {
    // Activity logging is handled server-side now.
    // This is a no-op stub so existing UI calls don't break.
  };

  const searchUsersByEmail = async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length < 5 || !normalizedEmail.includes('@')) return [];

    try {
      const res = await apiFetch(`/auth/users?email=${encodeURIComponent(normalizedEmail)}`);
      return res.data || [];
    } catch (err) {
      console.error('Failed to search users:', err);
      return [];
    }
  };

  async function refreshNetwork() {
    try {
      const [networkRes, incomingRes, outgoingRes, suggestionsRes] = await Promise.all([
        apiFetch('/network'),
        apiFetch('/network/requests/incoming'),
        apiFetch('/network/requests/outgoing'),
        apiFetch('/network/suggestions'),
      ]);
      setNetworkConnections(networkRes.data?.connections || []);
      setIncomingConnectionRequests(incomingRes.data || networkRes.data?.incoming || []);
      setOutgoingConnectionRequests(outgoingRes.data || networkRes.data?.outgoing || []);
      setNetworkSuggestions(suggestionsRes.data || []);
      return {
        connections: networkRes.data?.connections || [],
        incoming: incomingRes.data || networkRes.data?.incoming || [],
        outgoing: outgoingRes.data || networkRes.data?.outgoing || [],
      };
    } catch (err) {
      console.error('Failed to refresh network:', err);
      return { connections: [], incoming: [], outgoing: [] };
    }
  }
  const discoverNetworkUsers = async (query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    try {
      const res = await apiFetch(`/network/discover?query=${encodeURIComponent(trimmed)}`);
      return res.data || [];
    } catch (err) {
      console.error('Failed to discover network users:', err);
      return [];
    }
  };

  const sendConnectionRequest = async (receiverId, message = '') => {
    const res = await apiFetch('/network/request', {
      method: 'POST',
      body: JSON.stringify({ receiverId, message }),
    });
    await refreshNetwork();
    return res.data;
  };

  const acceptConnectionRequest = async (requestId) => {
    const res = await apiFetch(`/network/request/${requestId}/accept`, { method: 'POST' });
    await refreshNetwork();
    await refreshData();
    return res.data;
  };

  const declineConnectionRequest = async (requestId) => {
    const res = await apiFetch(`/network/request/${requestId}/decline`, { method: 'POST' });
    await refreshNetwork();
    return res.data;
  };

  const cancelConnectionRequest = async (requestId) => {
    const res = await apiFetch(`/network/requests/${requestId}`, { method: 'DELETE' });
    await refreshNetwork();
    return res.data;
  };
  const sendInvitation = async (projectId, receiverId) => {
    try {
      const res = await apiFetch('/invitations', {
        method: 'POST',
        body: JSON.stringify({ projectId, receiverId }),
      });
      return res.success;
    } catch (err) {
      console.error('Failed to send invitation:', err);
      throw err;
    }
  };

  const acceptInvitation = async (invitationId) => {
    try {
      const res = await apiFetch(`/invitations/${invitationId}/accept`, {
        method: 'PUT',
      });
      if (res.success) {
        setPendingInvitations(prev => prev.filter(inv => inv._id !== invitationId));
        await refreshData();
      }
      return res.success;
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      throw err;
    }
  };

  const rejectInvitation = async (invitationId) => {
    try {
      const res = await apiFetch(`/invitations/${invitationId}/reject`, {
        method: 'PUT',
      });
      if (res.success) {
        setPendingInvitations(prev => prev.filter(inv => inv._id !== invitationId));
        await refreshData();
      }
      return res.success;
    } catch (err) {
      console.error('Failed to reject invitation:', err);
      throw err;
    }
  };

  const refreshChats = async () => {
    try {
      const res = await apiFetch('/chats');
      setConversations(res.data || []);
      return res.data || [];
    } catch (err) {
      console.error('Failed to fetch chats:', err);
      return [];
    }
  };

  const startDirectChat = async (participantId) => {
    const res = await apiFetch('/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
    if (res.success && res.data) {
      setConversations(prev => {
        const exists = prev.some(item => item._id === res.data._id);
        return exists ? prev.map(item => item._id === res.data._id ? res.data : item) : [res.data, ...prev];
      });
    }
    return res.data;
  };

  const getProjectChat = async (projectId) => {
    const res = await apiFetch(`/projects/${projectId}/chat`);
    if (res.success && res.data) {
      setConversations(prev => {
        const exists = prev.some(item => item._id === res.data._id);
        return exists ? prev.map(item => item._id === res.data._id ? res.data : item) : [res.data, ...prev];
      });
    }
    return res.data;
  };

  const getChatMessages = async (conversationId) => {
    const res = await apiFetch(`/chats/${conversationId}/messages`);
    setConversations(prev => prev.map(item => item._id === conversationId ? { ...item, unreadCount: 0 } : item));
    return res.data || [];
  };

  const sendChatMessage = async (conversationId, text, attachments = []) => {
    const res = await apiFetch(`/chats/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, attachments }),
    });
    return res.data;
  };
  const refreshMeetings = async () => {
    try {
      const [activeRes, meetingsRes] = await Promise.all([
        apiFetch('/meetings/active'),
        apiFetch('/meetings'),
      ]);
      setActiveMeetings(activeRes.data || []);
      setMeetings(meetingsRes.data || []);
      return meetingsRes.data || [];
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
      return [];
    }
  };
  const scheduleProjectMeeting = async (projectId, meetingData) => {
    const res = await apiFetch(`/meetings/project/${projectId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(meetingData),
    });
    if (res.success && res.data) {
      setMeetings(prev => [res.data, ...prev.filter(item => item._id !== res.data._id)]);
      await refreshData();
    }
    return res.data;
  };

  const updateProjectMeeting = async (meetingId, meetingData) => {
    const res = await apiFetch(`/meetings/${meetingId}`, {
      method: 'PUT',
      body: JSON.stringify(meetingData),
    });
    if (res.success && res.data) {
      setMeetings(prev => res.data.provider === 'scheduled' ? prev.map(item => item._id === res.data._id ? res.data : item) : prev);
      await refreshData();
    }
    return res.data;
  };

  const cancelProjectMeeting = async (meetingId) => {
    const res = await apiFetch(`/meetings/${meetingId}/cancel`, { method: 'POST' });
    if (res.success && res.data) {
      setActiveMeetings(prev => prev.filter(item => item._id !== meetingId));
      setMeetings(prev => res.data.provider === 'scheduled' ? prev.map(item => item._id === res.data._id ? res.data : item) : prev);
      await refreshData();
    }
    return res.data;
  };

  const startProjectMeeting = async (projectId, meetingData = {}) => {
    const res = await apiFetch(`/meetings/project/${projectId}/start`, {
      method: 'POST',
      body: JSON.stringify(meetingData),
    });
    if (res.success && res.data) {
      setActiveMeetings(prev => {
        const exists = prev.some(item => item._id === res.data._id);
        return exists ? prev.map(item => item._id === res.data._id ? res.data : item) : [res.data, ...prev];
      });
      if (res.data.provider === 'scheduled') {
        setMeetings(prev => {
          const exists = prev.some(item => item._id === res.data._id);
          return exists ? prev.map(item => item._id === res.data._id ? res.data : item) : [res.data, ...prev];
        });
      }
      await refreshData();
    }
    return res.data;
  };

  const startScheduledMeeting = async (meetingId) => {
    const res = await apiFetch(`/meetings/${meetingId}/start`, { method: 'POST' });
    if (res.success && res.data) {
      setActiveMeetings(prev => {
        const exists = prev.some(item => item._id === res.data._id);
        return exists ? prev.map(item => item._id === res.data._id ? res.data : item) : [res.data, ...prev];
      });
      setMeetings(prev => {
        const exists = prev.some(item => item._id === res.data._id);
        return exists ? prev.map(item => item._id === res.data._id ? res.data : item) : [res.data, ...prev];
      });
      await refreshData();
    }
    return res.data;
  };
  const joinProjectMeeting = async (meetingId) => {
    const res = await apiFetch(`/meetings/${meetingId}/join`, { method: 'POST' });
    if (res.success && res.data) {
      setActiveMeetings(prev => prev.map(item => item._id === res.data._id ? res.data : item));
      setMeetings(prev => res.data.provider === 'scheduled' ? prev.map(item => item._id === res.data._id ? res.data : item) : prev);
    }
    return res.data;
  };

  const leaveProjectMeeting = async (meetingId) => {
    const res = await apiFetch(`/meetings/${meetingId}/leave`, { method: 'POST' });
    if (res.success && res.data) {
      setActiveMeetings(prev => prev.map(item => item._id === res.data._id ? res.data : item));
      setMeetings(prev => res.data.provider === 'scheduled' ? prev.map(item => item._id === res.data._id ? res.data : item) : prev);
    }
    return res.data;
  };

  const endProjectMeeting = async (meetingId) => {
    const res = await apiFetch(`/meetings/${meetingId}/end`, { method: 'POST' });
    if (res.success) {
      setActiveMeetings(prev => prev.filter(item => item._id !== meetingId));
      setMeetings(prev => prev.map(item => item._id === res.data?._id ? res.data : item));
      await refreshData();
    }
    return res.data;
  };
  const markNotificationAsRead = async (notificationId) => {
    try {
      const res = await apiFetch(`/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      if (res.success) {
        setDbNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n));
      }
      return res.success;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const res = await apiFetch('/notifications/read-all', {
        method: 'PUT',
      });
      if (res.success) {
        setDbNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
      return res.success;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      users,
      projects,
      tasks,
      activityLogs,
      pendingInvitations,
      dbNotifications,
            conversations,
      activeMeetings,
      meetings,
      networkConnections,
      incomingConnectionRequests,
      outgoingConnectionRequests,
      networkSuggestions,
      latestNotification,
      latestInvitation,
      latestMeetingEvent,
      latestTaskEvent,
      activeMessageConversationId,
      setActiveMessageConversationId,
      latestChatMessage,
      latestChatUpdate,
      dataLoading,
      updateProfile,
      addProject,
      editProject,
      deleteProject,
      addMemberToProject,
      removeMemberFromProject,
      addTask,
      editTask,
      deleteTask,
      toggleTaskStatus,
      logActivity,
      refreshData,
      apiFetch,
      searchUsersByEmail,
      refreshNetwork,
      discoverNetworkUsers,
      sendConnectionRequest,
      acceptConnectionRequest,
      declineConnectionRequest,
      cancelConnectionRequest,
      sendInvitation,
      acceptInvitation,
      rejectInvitation,
            refreshChats,
      startDirectChat,
      getProjectChat,
      getChatMessages,
      sendChatMessage,
      refreshMeetings,
      scheduleProjectMeeting,
      updateProjectMeeting,
      cancelProjectMeeting,
      startProjectMeeting,
      startScheduledMeeting,
      joinProjectMeeting,
      leaveProjectMeeting,
      endProjectMeeting,
      markNotificationAsRead,
      markAllNotificationsAsRead,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
