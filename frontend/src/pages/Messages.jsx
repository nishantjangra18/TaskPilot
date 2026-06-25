import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Check, ChevronDown, CircleStop, Hash, MessageSquare, Mic, MicOff, Phone, PhoneOff, Search, Send, Users, UserPlus, Video, Volume2, VolumeX, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { getProjectIcon } from '../utils/iconHelper';
import { toast } from 'sonner';

const today = () => new Date().toISOString().split('T')[0];
const blankMeetingForm = (participants = []) => ({ title: '', description: '', date: today(), startTime: '10:00', endTime: '10:30', participants, meetingType: 'video', recurrence: 'none' });

const Messages = () => {
  const {
    currentUser, users, projects, conversations, activeMeetings, latestChatMessage,
    setActiveMessageConversationId, refreshChats, startDirectChat, getProjectChat,
    getChatMessages, sendChatMessage, startProjectMeeting, scheduleProjectMeeting,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [meetingMenuOpen, setMeetingMenuOpen] = useState(false);
  const [showStartMeetingModal, setShowStartMeetingModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [startMeetingForm, setStartMeetingForm] = useState({ title: '', description: '' });
  const [meetingForm, setMeetingForm] = useState(blankMeetingForm());
  const [activeAudioCall, setActiveAudioCall] = useState(null);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const messagesEndRef = useRef(null);
  const audioStreamRef = useRef(null);

  useEffect(() => { refreshChats(); }, []);
  useEffect(() => () => setActiveMessageConversationId(null), [setActiveMessageConversationId]);
  useEffect(() => {
    if (!latestChatMessage || !activeConversation || latestChatMessage.conversationId !== activeConversation._id) return;
    setMessages(prev => prev.some(message => message._id === latestChatMessage.message._id) ? prev : [...prev, latestChatMessage.message]);
  }, [latestChatMessage, activeConversation]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (activeConversation?.type !== 'project') {
      setShowParticipants(false);
      setMeetingMenuOpen(false);
    }
  }, [activeConversation]);
  useEffect(() => {
    if (!activeAudioCall || !callStartedAt) return undefined;
    const id = window.setInterval(() => setCallDuration(Math.floor((Date.now() - callStartedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [activeAudioCall, callStartedAt]);
  useEffect(() => () => audioStreamRef.current?.getTracks().forEach(track => track.stop()), []);

  const directConversations = useMemo(() => conversations.filter(conversation => conversation.type === 'direct'), [conversations]);
  const projectConversationsByProjectId = useMemo(() => {
    const map = new Map();
    conversations.filter(conversation => conversation.type === 'project' && conversation.projectId).forEach(conversation => map.set(conversation.projectId._id || conversation.projectId, conversation));
    return map;
  }, [conversations]);
  const activeMeetingsByProjectId = useMemo(() => {
    const map = new Map();
    (activeMeetings || []).forEach(meeting => {
      const projectId = meeting.projectId?._id || meeting.projectId;
      if (projectId) map.set(projectId, meeting);
    });
    return map;
  }, [activeMeetings]);
  const availableUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (query.length < 5 || !query.includes('@')) return [];
    return users
      .filter(user => (user._id || user.id) !== currentUser?.id)
      .filter(user => {
        const email = user.email?.toLowerCase() || '';
        return email === query || email.startsWith(query);
      })
      .slice(0, 3);
  }, [users, currentUser, userSearch]);
  const canShowUserSearch = userSearch.trim().length >= 5 && userSearch.includes('@');

  const formatTime = (dateValue) => dateValue ? new Date(dateValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const getConversationTitle = (conversation) => {
    if (!conversation) return 'Select a conversation';
    if (conversation.type === 'project') return conversation.projectId?.name || 'Project Chat';
    const other = (conversation.participants || []).find(user => (user._id || user.id) !== currentUser?.id);
    return other?.name || 'Direct Message';
  };
  const getConversationSubtitle = (conversation) => {
    if (!conversation) return '';
    if (conversation.type === 'project') return 'Team Chat';
    return 'Online';
  };
  const getDirectParticipant = (conversation) => {
    if (!conversation || conversation.type !== 'direct') return null;
    return (conversation.participants || []).find(user => (user._id || user.id) !== currentUser?.id);
  };

  const activeProjectId = activeConversation?.type === 'project' ? activeConversation.projectId?._id || activeConversation.projectId : null;
  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find(project => (project._id || project.id) === activeProjectId) || activeConversation.projectId;
  }, [activeConversation, activeProjectId, projects]);
  const projectParticipants = useMemo(() => {
    if (!activeProject) return [];
    const owner = activeProject.owner && typeof activeProject.owner === 'object' ? activeProject.owner : users.find(user => (user._id || user.id) === activeProject.owner);
    const ownerId = owner?._id || owner?.id || activeProject.owner;
    const members = (activeProject.members || [])
      .map(member => typeof member === 'object' ? member : users.find(user => (user._id || user.id) === member))
      .filter(Boolean)
      .filter(member => (member._id || member.id) !== ownerId);
    return [...(owner ? [{ ...owner, role: 'Owner' }] : []), ...members.map(member => ({ ...member, role: 'Member' }))];
  }, [activeProject, users]);
  const projectParticipantIds = projectParticipants.map(member => member._id || member.id).filter(Boolean);

  const openConversation = async (conversation) => {
    setActiveConversation(conversation);
    setActiveMessageConversationId(conversation._id);
    setMeetingMenuOpen(false);
    setLoadingMessages(true);
    try {
      setMessages(await getChatMessages(conversation._id));
    } catch (err) {
      console.error('Failed to open conversation:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };
  const openDirectChat = async (userId) => {
    const conversation = await startDirectChat(userId);
    if (conversation) {
      setUserSearch('');
      openConversation(conversation);
    }
  };
  const openProjectChat = async (projectId) => {
    const conversation = projectConversationsByProjectId.get(projectId) || await getProjectChat(projectId);
    if (conversation) openConversation(conversation);
  };

  useEffect(() => {
    const targetConversationId = location.state?.conversationId;
    if (!targetConversationId || activeConversation?._id === targetConversationId) return;
    const conversation = conversations.find(item => item._id === targetConversationId);
    if (conversation) openConversation(conversation);
  }, [location.state, conversations, activeConversation]);

  const resetMeetingForm = () => setMeetingForm(blankMeetingForm(projectParticipantIds));
  const openStartMeetingModal = () => {
    setMeetingMenuOpen(false);
    setStartMeetingForm({ title: `${getConversationTitle(activeConversation)} Meeting`, description: '' });
    setShowStartMeetingModal(true);
  };
  const openScheduleMeetingModal = () => {
    setMeetingMenuOpen(false);
    setMeetingForm(blankMeetingForm(projectParticipantIds));
    setShowScheduleModal(true);
  };
  const toggleMeetingParticipant = (userId) => setMeetingForm(prev => ({
    ...prev,
    participants: prev.participants.includes(userId) ? prev.participants.filter(id => id !== userId) : [...prev.participants, userId],
  }));
  const handleStartMeeting = async (event) => {
    event.preventDefault();
    if (!activeProjectId || !startMeetingForm.title.trim() || meetingLoading) return;
    setMeetingLoading(true);
    try {
      const meeting = await startProjectMeeting(activeProjectId, { title: startMeetingForm.title.trim(), description: startMeetingForm.description.trim() });
      if (meeting) {
        setShowStartMeetingModal(false);
        setStartMeetingForm({ title: '', description: '' });
        navigate(`/projects/${activeProjectId}/meeting`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start meeting.');
    } finally {
      setMeetingLoading(false);
    }
  };
  const handleScheduleMeetingSubmit = async (event) => {
    event.preventDefault();
    if (!activeProjectId || !meetingForm.title.trim() || scheduleSaving) return;
    if (meetingForm.endTime <= meetingForm.startTime) {
      toast.error('End time must be after start time.');
      return;
    }
    setScheduleSaving(true);
    try {
      await scheduleProjectMeeting(activeProjectId, {
        title: meetingForm.title.trim(), description: meetingForm.description, date: meetingForm.date,
        startTime: meetingForm.startTime, endTime: meetingForm.endTime,
        participants: meetingForm.participants.length ? meetingForm.participants : projectParticipantIds,
        meetingType: meetingForm.meetingType, recurrence: meetingForm.recurrence,
      });
      setShowScheduleModal(false);
      resetMeetingForm();
      toast.success('Meeting scheduled.');
    } catch (err) {
      toast.error(err.message || 'Failed to schedule meeting.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const formatCallDuration = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const startAudioCall = async () => {
    const participant = getDirectParticipant(activeConversation);
    if (!participant || activeAudioCall) return;
    try {
      if (navigator.mediaDevices?.getUserMedia) audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setActiveAudioCall(participant);
      setCallStartedAt(Date.now());
      setCallDuration(0);
      setMicOn(true);
      setSpeakerOn(true);
    } catch (err) {
      toast.error(err.message || 'Microphone access is required for audio calls.');
    }
  };
  const toggleMic = () => setMicOn(prev => {
    const next = !prev;
    audioStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = next; });
    return next;
  });
  const endAudioCall = () => {
    audioStreamRef.current?.getTracks().forEach(track => track.stop());
    audioStreamRef.current = null;
    setActiveAudioCall(null);
    setCallStartedAt(null);
    setCallDuration(0);
  };

  const handleMeetingMessageClick = (message) => {
    if (message.metadata?.type !== 'meeting') return;
    if (message.metadata.status === 'ended') {
      toast('This meeting has ended.');
      return;
    }
    const projectId = message.metadata.projectId || activeProjectId;
    if (projectId) navigate(`/projects/${projectId}/meeting`);
  };
  const getMeetingSystemDetails = (message) => {
    const text = message.text || '';
    const lower = text.toLowerCase();
    const metadata = message.metadata || {};
    let Icon = CalendarDays;
    let label = 'Meeting Update';
    let tone = 'text-violet-500 dark:text-violet-400';
    if (lower.includes('started')) {
      Icon = Video; label = 'Meeting Started'; tone = 'text-emerald-500 dark:text-emerald-400';
    } else if (lower.includes('ended')) {
      Icon = CircleStop; label = 'Meeting Ended'; tone = 'text-rose-500 dark:text-rose-400';
    } else if (lower.includes('updated')) {
      label = 'Meeting Updated';
    } else if (lower.includes('cancelled') || lower.includes('canceled')) {
      Icon = CircleStop; label = 'Meeting Cancelled'; tone = 'text-rose-500 dark:text-rose-400';
    } else if (lower.includes('scheduled')) {
      label = 'Meeting Scheduled';
    }
    const withoutIcon = text.replace(/^[^A-Za-z0-9]+\s*/, '');
    let title = metadata.title || withoutIcon.replace(/^Meeting\s+(scheduled|updated|started|ended|cancelled|canceled)(\s+by\s+[^:]+)?\s*:?\s*/i, '').replace(/\s+on\s+.+$/i, '').replace(/\nDuration:.+$/i, '').trim();
    if (!title || title.toLowerCase().startsWith('duration:')) title = activeProject?.name ? `${activeProject.name} Meeting` : 'Project meeting';
    const scheduledMatch = withoutIcon.match(/\son\s(.+?)\sfrom\s(.+)$/i);
    const durationMatch = text.match(/Duration:\s*(.+)$/i);
    const detail = durationMatch ? `Duration: ${durationMatch[1]}` : scheduledMatch ? `${scheduledMatch[1]} - ${scheduledMatch[2]}` : formatTime(message.createdAt);
    return { Icon, label, title, detail, tone };
  };
  const renderMeetingSystemMessage = (message) => {
    const { Icon, label, title, detail, tone } = getMeetingSystemDetails(message);
    return (
      <div key={message._id} className="flex justify-center py-1.5">
        <button type="button" onClick={() => handleMeetingMessageClick(message)} disabled={message.metadata?.status === 'ended'} className="group max-w-[82%] inline-flex items-center gap-3 rounded-full border border-slate-200/70 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 px-4 py-2 text-left opacity-85 hover:opacity-100 hover:shadow-sm transition-all disabled:cursor-default">
          <span className={`shrink-0 h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${tone}`}><Icon className="h-3.5 w-3.5" /></span>
          <span className="min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{title}</span>
            <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">{detail}</span>
          </span>
        </button>
      </div>
    );
  };
  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeConversation || !messageText.trim() || sending) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);
    try {
      await sendChatMessage(activeConversation._id, text);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };
  const renderConversationRow = (conversation) => {
    const isActive = activeConversation?._id === conversation._id;
    const other = conversation.type === 'direct' ? (conversation.participants || []).find(user => (user._id || user.id) !== currentUser?.id) : null;
    return (
      <button key={conversation._id} onClick={() => openConversation(conversation)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all ${isActive ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40' : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
        {conversation.type === 'direct' ? <Avatar name={other?.name || 'User'} avatar={other?.avatar} className="h-9 w-9 text-[11px] border border-slate-200 dark:border-slate-700" /> : <div className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">{getProjectIcon(conversation.projectId?.icon, { className: 'h-4.5 w-4.5' })}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">{getConversationTitle(conversation)}</span>
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">{formatTime(conversation.lastMessage?.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{conversation.lastMessage?.text || getConversationSubtitle(conversation)}</span>
            {conversation.unreadCount > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">{conversation.unreadCount}</span>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="h-[calc(100vh-7rem)] md:h-[calc(100vh-2rem)] md:-mt-6 md:-mb-6 overflow-hidden flex items-center animate-in fade-in duration-200 max-w-6xl mx-auto text-left">
      <div className="grid grid-cols-1 grid-rows-[minmax(0,280px)_minmax(0,1fr)] lg:grid-cols-[340px_1fr] lg:grid-rows-none gap-6 h-full min-h-0 w-full">
        <aside className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden flex flex-col h-full min-h-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by email..." className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 text-slate-800 dark:text-slate-100 placeholder-slate-400" />
            </div>
            {canShowUserSearch && (
              <div className="mt-3 space-y-1.5">
                {availableUsers.length === 0 ? <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">No matching user found</div> : availableUsers.map(user => (
                  <button key={user._id || user.id} onClick={() => openDirectChat(user._id || user.id)} className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={user.name} avatar={user.avatar} className="h-7 w-7 text-[9px] border border-slate-200 dark:border-slate-700" />
                      <span className="min-w-0"><span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</span><span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.email}</span></span>
                    </span>
                    <UserPlus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 space-y-5 overflow-y-auto flex-1 min-h-0">
            <section>
              <div className="flex items-center gap-2 px-1 mb-2"><MessageSquare className="h-3.5 w-3.5 text-violet-500" /><span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Direct Messages</span></div>
              <div className="space-y-1">{directConversations.length > 0 ? directConversations.map(renderConversationRow) : <div className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">Start a private chat by searching for a user.</div>}</div>
            </section>
            <section>
              <div className="flex items-center gap-2 px-1 mb-2"><Hash className="h-3.5 w-3.5 text-violet-500" /><span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Project Channels</span></div>
              <div className="space-y-1">
                {projects.map(project => {
                  const projectId = project._id || project.id;
                  const conversation = projectConversationsByProjectId.get(projectId);
                  const projectMeeting = activeMeetingsByProjectId.get(projectId);
                  const isActive = activeConversation?.projectId?._id === projectId || activeConversation?.projectId === projectId;
                  return (
                    <button key={projectId} onClick={() => openProjectChat(projectId)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all ${isActive ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40' : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                      <div className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">{getProjectIcon(project.icon, { className: 'h-4.5 w-4.5' })}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">{project.name}</span>
                          {projectMeeting && <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Meeting Live</span>}
                          {conversation?.unreadCount > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">{conversation.unreadCount}</span>}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate block mt-1">{conversation?.lastMessage?.text || `${(project.members || []).length} members`}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </aside>

        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden flex flex-col h-full min-h-0">
          {activeConversation ? (
            <>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {activeConversation.type === 'direct' ? <Avatar name={getDirectParticipant(activeConversation)?.name || 'User'} avatar={getDirectParticipant(activeConversation)?.avatar} className="h-10 w-10 text-[12px] border border-slate-200 dark:border-slate-700 shrink-0" /> : <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">{getProjectIcon(activeProject?.icon || activeConversation.projectId?.icon, { className: 'h-4.5 w-4.5' })}</div>}
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{getConversationTitle(activeConversation)}</h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">{getConversationSubtitle(activeConversation)}</p>
                    {activeConversation.type === 'project' && activeMeetingsByProjectId.get(activeProjectId) && <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Meeting Live</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeConversation.type === 'project' && (
                    <>
                      <button type="button" onClick={() => setShowParticipants(true)} className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" title="View members"><Users className="h-3.5 w-3.5" /><span>{projectParticipants.length || (activeConversation.participants || []).length} Members</span></button>
                      <div className="relative">
                        <button type="button" onClick={() => setMeetingMenuOpen(prev => !prev)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs transition-all active:scale-97" title="Meeting options"><Video className="h-4 w-4" /><span className="hidden sm:inline">Meeting</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${meetingMenuOpen ? 'rotate-180' : ''}`} /></button>
                        {meetingMenuOpen && <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-950/95 shadow-xl backdrop-blur-md p-1.5 z-20 animate-in fade-in zoom-in-95 duration-150">
                          <button type="button" onClick={openStartMeetingModal} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Video className="h-4 w-4 text-emerald-500" />Start Meeting</button>
                          <button type="button" onClick={openScheduleMeetingModal} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><CalendarDays className="h-4 w-4 text-violet-500" />Schedule Meeting</button>
                        </div>}
                      </div>
                    </>
                  )}
                  {activeConversation.type === 'direct' && <button type="button" onClick={startAudioCall} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-xs font-bold" title="Start audio call"><Phone className="h-4 w-4" /><span className="hidden sm:inline">Audio Call</span></button>}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 bg-slate-50/40 dark:bg-slate-950/30">
                {loadingMessages ? <div className="flex items-center justify-center h-full text-xs font-semibold text-slate-400 dark:text-slate-500">Loading messages...</div> : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center text-slate-400 dark:text-slate-500"><div><MessageSquare className="h-8 w-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" /><p className="text-sm font-bold text-slate-600 dark:text-slate-300">No messages yet</p><p className="text-xs mt-1">Send the first update when you are ready.</p></div></div>
                ) : messages.map(message => {
                  if (message.metadata?.type === 'meeting') return renderMeetingSystemMessage(message);
                  const senderId = message.senderId?._id || message.senderId;
                  const isMine = senderId === currentUser?.id;
                  return (
                    <div key={message._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <button type="button" onClick={() => handleMeetingMessageClick(message)} disabled={message.metadata?.type !== 'meeting'} className={`px-3.5 py-2.5 rounded-2xl border text-sm leading-relaxed text-left ${message.metadata?.type === 'meeting' ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'} ${isMine ? 'bg-violet-600 text-white border-violet-600 rounded-br-md' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-800 rounded-bl-md'}`}>{message.text}</button>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 px-1">{!isMine && `${message.senderId?.name || 'User'} - `}{formatTime(message.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-end gap-3">
                  <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend(event); } }} rows={1} placeholder="Write a message..." className="flex-1 resize-none px-3.5 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 text-slate-800 dark:text-slate-100 placeholder-slate-400" />
                  <button type="submit" disabled={!messageText.trim() || sending} className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors shrink-0 ${messageText.trim() && !sending ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'}`} title="Send message"><Send className="h-4.5 w-4.5" /></button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-slate-400 dark:text-slate-500 p-8"><div><MessageSquare className="h-10 w-10 mx-auto mb-4 text-slate-300 dark:text-slate-600" /><h2 className="text-base font-extrabold text-slate-700 dark:text-slate-200">Select a conversation</h2><p className="text-xs mt-1">Choose a direct message or project channel from the list.</p></div></div>
          )}
        </section>
      </div>

      {showParticipants && activeConversation?.type === 'project' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[10000] animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="min-w-0"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider truncate">Project Members</h3><p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{getConversationTitle(activeConversation)}</p></div>
              <button onClick={() => setShowParticipants(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {projectParticipants.map(member => <div key={member._id || member.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30"><div className="flex items-center gap-3 min-w-0"><Avatar name={member.name} avatar={member.avatar} className="h-9 w-9 text-[11px] border border-slate-200 dark:border-slate-700 shrink-0" /><div className="min-w-0"><span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{member.name}</span><span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{member.email}</span></div></div><span className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${member.role === 'Owner' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>{member.role}</span></div>)}
              {projectParticipants.length === 0 && <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">No members found.</div>}
            </div>
          </div>
        </div>
      )}

      {showStartMeetingModal && activeConversation?.type === 'project' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[10000] animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-150 dark:border-slate-800 animate-in zoom-in-95 duration-150 text-left overflow-hidden">
            <div className="flex justify-between items-center px-6 pt-6 pb-3 border-b border-slate-50 dark:border-slate-800"><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Start New Meeting</h3><p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Meeting title is shown across chat, calendar, and video room.</p></div><button type="button" onClick={() => { setShowStartMeetingModal(false); setStartMeetingForm({ title: '', description: '' }); }} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleStartMeeting} className="px-6 py-5 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Meeting Title</label><input type="text" required value={startMeetingForm.title} onChange={(event) => setStartMeetingForm(prev => ({ ...prev, title: event.target.value }))} className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-950 transition-all" placeholder="e.g. Sprint Planning" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Optional Description</label><textarea value={startMeetingForm.description} onChange={(event) => setStartMeetingForm(prev => ({ ...prev, description: event.target.value }))} className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-950 h-20 resize-none transition-all" placeholder="Agenda, context, or quick notes" /></div>
              <div className="flex justify-end gap-3 pt-1"><button type="button" onClick={() => { setShowStartMeetingModal(false); setStartMeetingForm({ title: '', description: '' }); }} className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button><button type="submit" disabled={!startMeetingForm.title.trim() || meetingLoading} className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs active:scale-97 text-white cursor-pointer ${startMeetingForm.title.trim() && !meetingLoading ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-transparent'}`}>{meetingLoading ? 'Starting...' : 'Start Meeting'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && activeConversation?.type === 'project' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[10000] animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-150 dark:border-slate-800 animate-in zoom-in-95 duration-150 text-left max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 pt-6 pb-3 border-b border-slate-50 dark:border-slate-800 shrink-0"><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Schedule Meeting</h3><p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Meetings belong to this project and appear read-only in Calendar.</p></div><button type="button" onClick={() => { setShowScheduleModal(false); resetMeetingForm(); }} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleScheduleMeetingSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-left">
                <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Meeting Title</label><input type="text" required value={meetingForm.title} onChange={(event) => setMeetingForm(prev => ({ ...prev, title: event.target.value }))} className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-950 transition-all" placeholder="e.g. Sprint planning" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</label><textarea value={meetingForm.description} onChange={(event) => setMeetingForm(prev => ({ ...prev, description: event.target.value }))} className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-950 h-20 resize-none transition-all" placeholder="Agenda, goals, or notes for participants" /></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Date</label><input type="date" required value={meetingForm.date} onChange={(event) => setMeetingForm(prev => ({ ...prev, date: event.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Start Time</label><input type="time" required value={meetingForm.startTime} onChange={(event) => setMeetingForm(prev => ({ ...prev, startTime: event.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20" /></div><div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">End Time</label><input type="time" required value={meetingForm.endTime} onChange={(event) => setMeetingForm(prev => ({ ...prev, endTime: event.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20" /></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Meeting Type</label><select value={meetingForm.meetingType} onChange={(event) => setMeetingForm(prev => ({ ...prev, meetingType: event.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-hidden"><option value="video">Video</option><option value="audio">Audio</option><option value="planning">Planning</option><option value="review">Review</option><option value="standup">Standup</option><option value="other">Other</option></select></div><div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Recurrence</label><select value={meetingForm.recurrence} onChange={(event) => setMeetingForm(prev => ({ ...prev, recurrence: event.target.value }))} className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-hidden"><option value="none">None</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div></div>
                <div><div className="flex items-center justify-between mb-2"><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Participants</label><span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Project members only</span></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">{projectParticipants.map(user => { const userId = user._id || user.id; const selected = meetingForm.participants.includes(userId); return <button key={userId} type="button" onClick={() => toggleMeetingParticipant(userId)} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all ${selected ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}><span className="flex items-center gap-2 min-w-0"><Avatar name={user.name} avatar={user.avatar} className="h-7 w-7 text-[9px] border border-slate-200 dark:border-slate-800" /><span className="min-w-0"><span className="block text-xs font-bold truncate">{user.name}</span><span className="block text-[10px] opacity-70 truncate">{user.email}</span></span></span>{selected && <Check className="h-4 w-4 shrink-0" />}</button>; })}{projectParticipants.length === 0 && <div className="sm:col-span-2 py-6 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">No project members found.</div>}</div></div>
              </div>
              <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/80 rounded-b-2xl flex justify-end space-x-3"><button type="button" onClick={() => { setShowScheduleModal(false); resetMeetingForm(); }} className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button><button type="submit" disabled={!meetingForm.title.trim() || scheduleSaving} className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs active:scale-97 text-white cursor-pointer ${meetingForm.title.trim() && !scheduleSaving ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-transparent'}`}>{scheduleSaving ? 'Saving...' : 'Schedule Meeting'}</button></div>
            </form>
          </div>
        </div>
      )}

      {activeAudioCall && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl text-center text-white p-6 animate-in zoom-in-95 duration-150"><div className="flex justify-end"><button type="button" onClick={endAudioCall} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Close call"><X className="h-5 w-5" /></button></div><Avatar name={activeAudioCall.name} avatar={activeAudioCall.avatar} className="h-24 w-24 text-2xl mx-auto border-4 border-slate-800 shadow-lg" /><h3 className="mt-5 text-lg font-extrabold truncate">{activeAudioCall.name}</h3><p className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-400">Audio Call</p><p className="mt-2 text-sm font-semibold text-slate-300 tabular-nums">{formatCallDuration(callDuration)}</p><div className="mt-7 flex items-center justify-center gap-3"><button type="button" onClick={toggleMic} className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${micOn ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-rose-600 text-white hover:bg-rose-700'}`} title="Toggle microphone">{micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</button><button type="button" onClick={() => setSpeakerOn(prev => !prev)} className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${speakerOn ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} title="Toggle speaker">{speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button><button type="button" onClick={endAudioCall} className="h-12 w-12 rounded-2xl flex items-center justify-center bg-rose-600 text-white hover:bg-rose-700 transition-colors" title="End call"><PhoneOff className="h-5 w-5" /></button></div></div>
        </div>
      )}
    </div>
  );
};

export default Messages;


