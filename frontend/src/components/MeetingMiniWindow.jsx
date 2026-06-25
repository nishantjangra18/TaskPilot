import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Maximize2, Mic, MicOff, PhoneOff, Users, Video, VideoOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

const formatElapsed = (startedAt) => {
  if (!startedAt) return '00:00';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

const MeetingMiniWindow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeMeetings = [], currentUser, projects = [], leaveProjectMeeting, endProjectMeeting } = useApp();
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const meeting = useMemo(() => {
    return activeMeetings.find(item => ['live', 'active'].includes(item.status));
  }, [activeMeetings]);

  if (!meeting || location.pathname.endsWith('/meeting')) return null;

  const projectId = meeting.projectId?._id || meeting.projectId;
  const project = typeof meeting.projectId === 'object'
    ? meeting.projectId
    : projects.find(item => (item._id || item.id) === projectId);
  const projectName = project?.name || 'Project';
  const meetingTitle = meeting.title || `${projectName} Meeting`;
  const activeParticipants = (meeting.participants || []).filter(participant => !participant.leftAt);
  const hostId = meeting.hostId?._id || meeting.hostId;
  const isHost = hostId === currentUser?.id;

  const handleExpand = () => {
    if (projectId) navigate(`/projects/${projectId}/meeting`);
  };

  const handleLeave = async () => {
    if (!meeting._id) return;
    try {
      if (isHost) {
        await endProjectMeeting(meeting._id);
      } else {
        await leaveProjectMeeting(meeting._id);
      }
    } catch (err) {
      console.error('Failed to leave mini meeting:', err);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9990] w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{meetingTitle}</h3>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">{projectName}</p>
        </div>
        <button
          type="button"
          onClick={handleExpand}
          className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center justify-center shrink-0"
          title="Expand meeting"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <div className="rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 px-3 py-2">{formatElapsed(meeting.startedAt || meeting.startsAt || now)}</div>
        <div className="rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{activeParticipants.length}</div>
        <div className="rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center gap-1.5">{muted ? <MicOff className="h-3.5 w-3.5 text-rose-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}{muted ? 'Muted' : 'Mic on'}</div>
        <div className="rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center gap-1.5">{cameraOff ? <VideoOff className="h-3.5 w-3.5 text-rose-400" /> : <Video className="h-3.5 w-3.5 text-emerald-400" />}{cameraOff ? 'Camera off' : 'Camera on'}</div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={handleExpand} className="flex-1 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors">Expand Meeting</button>
        <button type="button" onClick={() => setMuted(prev => !prev)} className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center justify-center" title="Mute">
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => setCameraOff(prev => !prev)} className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center justify-center" title="Camera">
          {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </button>
        <button type="button" onClick={handleLeave} className="h-9 w-9 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center" title="Leave meeting">
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default MeetingMiniWindow;
