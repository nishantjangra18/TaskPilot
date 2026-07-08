import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeProvider';
import Avatar from './Avatar';

const TOAST_DURATION = 5000;

const getId = (value) => (value?._id || value?.id || value)?.toString();

const formatToastTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getSystemAvatar = () => ({ name: 'TaskPilot', avatar: '/logo.png' });

const ToastCard = ({ title, senderName, description, timestamp, avatar, unread = true, type = 'system', onOpen, onClose }) => {
  const accentClass = type === 'message'
    ? 'bg-violet-600'
    : type === 'meeting'
      ? 'bg-emerald-500'
      : type === 'task'
        ? 'bg-blue-500'
        : 'bg-amber-500';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className="taskpilot-toast-card group w-[360px] max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-2xl shadow-slate-900/12 dark:shadow-black/35 backdrop-blur-xl text-left"
    >
      <div className="flex gap-3 p-4 pb-3">
        <div className="relative shrink-0">
          <Avatar
            name={avatar?.name || senderName || 'TaskPilot'}
            avatar={avatar?.avatar}
            className="h-10 w-10 text-[12px] border border-slate-200 dark:border-slate-700 shadow-sm"
          />
          {unread && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-violet-600 border-2 border-white dark:border-slate-900" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate">{senderName || title}</p>
              {senderName && title && senderName !== title && (
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">{title}</p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{timestamp}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
                className="opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Open in TaskPilot</span>
        <span className={`h-2 w-2 rounded-full ${accentClass}`} />
      </div>
      <div className="h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`taskpilot-toast-progress h-full ${accentClass}`} />
      </div>
    </div>
  );
};

const NotificationToastBridge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const {
    currentUser,
    conversations,
    latestChatMessage,
    latestNotification,
    latestInvitation,
    latestMeetingEvent,
    latestTaskEvent,
    activeMessageConversationId,
  } = useApp();

  const shownRef = useRef(new Set());
  const audioUnlockedRef = useRef(false);
  const pendingSoundRef = useRef(null);
  const audioRefs = useRef({
    message: null,
    notification: null,
  });

  useEffect(() => {
    audioRefs.current.message = new Audio('/sounds/message.mp3');
    audioRefs.current.notification = new Audio('/sounds/notification.mp3');
    Object.values(audioRefs.current).forEach((audio) => {
      if (!audio) return;
      audio.volume = 0.7;
      audio.preload = 'auto';
    });

    const unlockAudio = () => {
      audioUnlockedRef.current = true;
      Object.values(audioRefs.current).forEach((audio) => {
        if (!audio) return;
        audio.play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
          })
          .catch(() => {});
      });

      if (pendingSoundRef.current) {
        const queued = pendingSoundRef.current;
        pendingSoundRef.current = null;
        playSound(queued);
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const playSound = (kind) => {
    if (!audioUnlockedRef.current) {
      pendingSoundRef.current = kind;
      return;
    }

    const audio = audioRefs.current[kind === 'message' ? 'message' : 'notification'];
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.7;
    audio.play().catch(() => {});
  };

  const openToastTarget = (sonnerId, link, state) => {
    toast.dismiss(sonnerId);
    if (link) navigate(link, state ? { state } : undefined);
  };

  const showToast = ({
    id,
    title,
    senderName,
    description,
    link,
    state,
    sound = 'notification',
    suppress = false,
    avatar = getSystemAvatar(),
    type = 'system',
  }) => {
    if (!id || suppress || shownRef.current.has(id)) return;

    shownRef.current.add(id);
    playSound(sound === 'message' ? 'message' : 'notification');

    toast.custom((sonnerId) => (
      <ToastCard
        title={title}
        senderName={senderName || title}
        description={description}
        timestamp={formatToastTime()}
        avatar={avatar}
        type={type}
        onOpen={() => openToastTarget(sonnerId, link, state)}
        onClose={() => toast.dismiss(sonnerId)}
      />
    ), {
      id,
      duration: TOAST_DURATION,
    });
  };

  useEffect(() => {
    if (!latestChatMessage?.message || !currentUser) return;
    if (latestChatMessage.message.metadata?.type === 'meeting') return;

    const senderId = getId(latestChatMessage.message.senderId);
    if (senderId === currentUser.id) return;

    const conversationId = latestChatMessage.conversationId;
    const conversation = conversations.find(item => item._id === conversationId);
    const isExactConversation = location.pathname === '/messages' && activeMessageConversationId === conversationId;
    const sender = latestChatMessage.message.senderId;
    const senderName = sender?.name || 'New message';
    const title = conversation?.type === 'project'
      ? conversation.projectId?.name || 'Project channel'
      : 'Direct message';

    showToast({
      id: `chat-${latestChatMessage.message._id || latestChatMessage.receivedAt}`,
      title,
      senderName,
      description: latestChatMessage.message.text,
      link: '/messages',
      state: { conversationId },
      sound: 'message',
      avatar: { name: senderName, avatar: sender?.avatar },
      type: 'message',
      suppress: isExactConversation,
    });
  }, [activeMessageConversationId, conversations, currentUser, latestChatMessage, location.pathname]);

  useEffect(() => {
    if (!latestInvitation?.invitation) return;
    const invitation = latestInvitation.invitation;

    if (invitation.status === 'pending') {
      showToast({
        id: `invitation-${invitation._id || latestInvitation.receivedAt}`,
        title: 'Project invitation',
        senderName: invitation.senderName || 'TaskPilot',
        description: `You have been invited to join ${invitation.projectName}`,
        link: '/dashboard',
        state: { scrollToInvitations: true },
        type: 'system',
      });
    }
  }, [latestInvitation, location.pathname]);

  useEffect(() => {
    if (!latestNotification?.notification) return;

    const notification = latestNotification.notification;
    if (['invitation_received', 'meeting_started', 'meeting_ended', 'task_assigned', 'task_status_changed', 'user_mentioned'].includes(notification.type)) {
      return;
    }

    const isConnectionNotification = ['connection_request_received', 'connection_accepted', 'connection_declined'].includes(notification.type);
    const link = isConnectionNotification ? '/network' : (notification.metadata?.link || '/dashboard');
    const state = isConnectionNotification
      ? {
          networkTab: 'requests',
          requestList: notification.metadata?.requestList || 'incoming',
          connectionId: notification.metadata?.connectionId,
        }
      : notification.type === 'invitation_accepted' ? { openNotifications: true } : undefined;
    const titleMap = {
      invitation_accepted: 'Invitation accepted',
      connection_request_received: 'Connection request',
      connection_accepted: 'Connection accepted',
      connection_declined: 'Connection declined',
    };

    showToast({
      id: `notification-${notification._id || latestNotification.receivedAt}`,
      title: titleMap[notification.type] || 'Notification',
      senderName: 'TaskPilot',
      description: notification.message,
      link,
      state,
      type: 'system',
    });
  }, [latestNotification, location.pathname]);

  useEffect(() => {
    if (!latestMeetingEvent?.meeting || !currentUser) return;

    const meeting = latestMeetingEvent.meeting;
    const projectId = getId(meeting.projectId);
    const projectName = meeting.projectId?.name || 'Project';
    const projectPath = `/projects/${projectId}`;
    const type = latestMeetingEvent.type;
    const isStarted = type === 'meeting_started';
    const isEnded = type === 'meeting_ended';
    const actorName = latestMeetingEvent.actor?.name || meeting.endedBy?.name || latestMeetingEvent.endedBy?.name;
    const actorId = getId(latestMeetingEvent.actor) || getId(meeting.endedBy) || getId(latestMeetingEvent.endedBy);
    const hostId = getId(meeting.hostId);
    const isActor = actorId && actorId === currentUser.id;
    const isHostStart = isStarted && hostId === currentUser.id;

    showToast({
      id: `${type}-${meeting._id || latestMeetingEvent.receivedAt}-${actorName || ''}`,
      title: isStarted ? 'Meeting started' : isEnded ? 'Meeting ended' : type === 'participant_joined' ? 'User joined' : 'User left',
      senderName: actorName || projectName,
      description: isStarted
        ? `${projectName} meeting has started.`
        : isEnded
          ? `Meeting ended by ${actorName || 'host'}.`
          : type === 'participant_joined'
            ? `${actorName || 'Someone'} joined the meeting.`
            : `${actorName || 'Someone'} left the meeting.`,
      link: projectPath,
      type: 'meeting',
      suppress: isHostStart || isActor || location.pathname === projectPath,
    });
  }, [currentUser, latestMeetingEvent, location.pathname]);

  useEffect(() => {
    if (!latestTaskEvent?.message) return;

    const link = latestTaskEvent.metadata?.link || '/dashboard';
    const titleMap = {
      task_assigned: 'Task assigned',
      task_status_changed: 'Task updated',
      user_mentioned: 'You were mentioned',
    };

    const isExactSource = location.pathname === link ||
      (latestTaskEvent.metadata?.conversationId && location.pathname === '/messages' && activeMessageConversationId === latestTaskEvent.metadata.conversationId);

    showToast({
      id: `task-${latestTaskEvent.type}-${latestTaskEvent.notification?._id || latestTaskEvent.receivedAt}`,
      title: titleMap[latestTaskEvent.type] || 'Notification',
      senderName: latestTaskEvent.metadata?.projectName || 'TaskPilot',
      description: latestTaskEvent.message,
      link,
      state: latestTaskEvent.metadata?.conversationId ? { conversationId: latestTaskEvent.metadata.conversationId } : undefined,
      type: latestTaskEvent.type === 'user_mentioned' ? 'message' : 'task',
      suppress: isExactSource,
    });
  }, [activeMessageConversationId, latestTaskEvent, location.pathname]);

  return (
    <Toaster
      position="top-right"
      theme={theme === 'dark' ? 'dark' : 'light'}
      offset="20px"
      gap={10}
      visibleToasts={4}
      duration={TOAST_DURATION}
      closeButton
      pauseWhenPageIsHidden
      toastOptions={{
        unstyled: true,
      }}
    />
  );
};

export default NotificationToastBridge;

