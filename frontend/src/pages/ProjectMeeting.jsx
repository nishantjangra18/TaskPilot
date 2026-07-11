import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AlertCircle, ChevronLeft, Mic, MicOff, PhoneOff, Users, Video, VideoOff } from 'lucide-react';
import { MeetingProvider, useMeeting, useParticipant } from '@videosdk.live/react-sdk';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';

const ParticipantTile = ({ participantId }) => {
  const micRef = useRef(null);
  const videoRef = useRef(null);
  const { displayName, webcamStream, micStream, webcamOn, micOn, isLocal } = useParticipant(participantId);

  useEffect(() => {
    if (!videoRef.current || !webcamStream || !webcamOn) return;
    const mediaStream = new MediaStream();
    mediaStream.addTrack(webcamStream.track);
    videoRef.current.srcObject = mediaStream;
    videoRef.current.play().catch(() => {});
  }, [webcamStream, webcamOn]);

  useEffect(() => {
    if (!micRef.current || !micStream || !micOn || isLocal) return;
    const mediaStream = new MediaStream();
    mediaStream.addTrack(micStream.track);
    micRef.current.srcObject = mediaStream;
    micRef.current.play().catch(() => {});
  }, [micStream, micOn, isLocal]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 min-h-[180px] flex items-center justify-center">
      {webcamOn ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-300">
          <Avatar name={displayName || 'User'} className="h-14 w-14 text-base" />
          <p className="mt-3 text-sm font-bold">{displayName || 'Participant'}</p>
        </div>
      )}
      <audio ref={micRef} autoPlay playsInline muted={isLocal} />
      <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1.5 backdrop-blur-sm">
        {micOn ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" />}
        <span className="text-xs font-bold text-white max-w-[160px] truncate">{displayName || 'Participant'}{isLocal ? ' (You)' : ''}</span>
      </div>
    </div>
  );
};

const VideoSdkRoom = ({ isHost, onLeave, onEnd }) => {
  const [joined, setJoined] = useState(false);
  const [ending, setEnding] = useState(false);
  const { join, leave, toggleMic, toggleWebcam, participants, localMicOn, localWebcamOn } = useMeeting({
    onMeetingJoined: () => setJoined(true),
    onMeetingLeft: () => {
      setJoined(false);
      onLeave(false);
    },
  });

  useEffect(() => {
    join();
    return () => {
      leave();
    };
  }, [join, leave]);

  const participantIds = [...participants.keys()];

  const handleLeave = async () => {
    leave();
  };

  const handleEnd = async () => {
    if (!isHost || ending) return;
    setEnding(true);
    try {
      await onEnd();
      leave();
    } finally {
      setEnding(false);
    }
  };

  return (
    <>
      <div className="bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden min-h-0 relative p-4">
        {!joined ? (
          <div className="absolute inset-0 flex items-center justify-center text-center text-slate-300">
            <div>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto mb-4"></div>
              <p className="text-sm font-semibold">Joining secure TaskPilot meeting...</p>
            </div>
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 overflow-y-auto">
            {participantIds.map(participantId => (
              <ParticipantTile key={participantId} participantId={participantId} />
            ))}
          </div>
        )}

        <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl p-2">
          <button
            type="button"
            onClick={() => toggleMic()}
            className="h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            title="Toggle microphone"
          >
            {localMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => toggleWebcam()}
            className="h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            title="Toggle camera"
          >
            {localWebcamOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleLeave}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors"
          >
            <PhoneOff className="h-4 w-4" />
            <span>Leave</span>
          </button>
          {isHost && (
            <button
              type="button"
              onClick={handleEnd}
              disabled={ending}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 transition-colors"
            >
              <PhoneOff className="h-4 w-4" />
              <span>{ending ? 'Ending...' : 'End Meeting'}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

const ProjectMeeting = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const hasJoinedRef = useRef(false);

  const {
    projects,
    users,
    currentUser,
    activeMeetings,
    latestMeetingEvent,
    apiFetch,
    refreshMeetings,
    joinProjectMeeting,
    leaveProjectMeeting,
    endProjectMeeting,
  } = useApp();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomError, setRoomError] = useState('');

  const project = projects.find(item => (item._id || item.id) === projectId);

  const activeMeeting = useMemo(() => {
    return (activeMeetings || []).find(item => {
      const itemProjectId = item.projectId?._id || item.projectId;
      return itemProjectId === projectId;
    });
  }, [activeMeetings, projectId]);

  useEffect(() => {
    let isMounted = true;

    const fetchActiveMeeting = async () => {
      setLoading(true);
      try {
        if (activeMeeting) {
          setMeeting(activeMeeting);
          return;
        }

        const res = await apiFetch(`/meetings/project/${projectId}/active`);
        if (isMounted) {
          setMeeting(res.data || null);
        }
      } catch {
        if (isMounted) {
          setMeeting(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActiveMeeting();

    return () => {
      isMounted = false;
    };
  }, [activeMeeting, apiFetch, projectId]);

  useEffect(() => {
    if (!meeting?._id || hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    joinProjectMeeting(meeting._id)
      .then(updatedMeeting => {
        if (updatedMeeting) {
          setMeeting(updatedMeeting);
          refreshMeetings();
        }
      })
      .catch((err) => setRoomError(err.message || 'Unable to join this meeting.'));
  }, [joinProjectMeeting, meeting?._id, refreshMeetings]);

  useEffect(() => {
    if (latestMeetingEvent?.type !== 'meeting_ended') return;
    const endedProjectId = latestMeetingEvent.meeting?.projectId?._id || latestMeetingEvent.meeting?.projectId;
    if (endedProjectId === projectId) {
      navigate(`/projects/${projectId}`);
    }
  }, [latestMeetingEvent, navigate, projectId]);

  const meetingProjectName = project?.name || meeting?.projectId?.name || 'Project';
  const meetingTitle = meeting?.title || `${meetingProjectName} Meeting`;
  const hostId = meeting?.hostId?._id || meeting?.hostId;
  const isHost = hostId === currentUser?.id;
  const activeParticipants = (meeting?.participants || []).filter(participant => !participant.leftAt);
  const participants = (meeting?.participants || []).map(participant => {
    const participantUser = participant.userId && typeof participant.userId === 'object'
      ? participant.userId
      : users.find(user => (user._id || user.id) === participant.userId);

    return participantUser ? {
      ...participantUser,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
      role: (participantUser._id || participantUser.id) === hostId ? 'Host' : 'Member',
    } : null;
  }).filter(Boolean).sort((a, b) => (a.role === 'Host' ? -1 : b.role === 'Host' ? 1 : 0));

  const handleLeaveMeeting = async (callBackend = true) => {
    if (callBackend && meeting?._id) {
      try {
        await leaveProjectMeeting(meeting._id);
      } catch (err) {
        console.error('Failed to leave meeting:', err);
      }
    }
    navigate(`/projects/${projectId}`);
  };

  const handleEndMeeting = async () => {
    if (!meeting?._id || !isHost) return;
    await endProjectMeeting(meeting._id);
    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-7rem)] md:h-[calc(100vh-2rem)] md:-mt-6 md:-mb-6 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-sm font-semibold">Opening meeting room...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="h-[calc(100vh-7rem)] md:h-[calc(100vh-2rem)] md:-mt-6 md:-mb-6 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 max-w-md">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Live Meeting</h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">There is no active meeting for this project right now.</p>
          <Link to={`/projects/${projectId}`} className="mt-6 inline-flex items-center text-violet-600 hover:text-violet-750 font-semibold text-sm">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to project
          </Link>
        </div>
      </div>
    );
  }

  const videoSdkToken = meeting.videoSdkToken || import.meta.env.VITE_VIDEOSDK_TOKEN;
  const videoSdkRoomId = meeting.videoSdkRoomId || meeting.meetingId;

  return (
    <div className="h-[calc(100vh-7rem)] md:h-[calc(100vh-2rem)] md:-mt-6 md:-mb-6 overflow-hidden flex flex-col gap-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">{meetingTitle}</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <Users className="h-3.5 w-3.5" />
            <span>{meetingProjectName}</span><span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span><span>{activeParticipants.length} participant{activeParticipants.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleLeaveMeeting(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors"
          >
            <PhoneOff className="h-4 w-4" />
            <span>Leave Meeting</span>
          </button>
          {isHost && (
            <button
              onClick={handleEndMeeting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End Meeting</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-4 min-h-0 flex-1">
        {videoSdkToken && videoSdkRoomId ? (
          <MeetingProvider
            config={{
              meetingId: videoSdkRoomId,
              micEnabled: true,
              webcamEnabled: true,
              name: currentUser?.name || 'TaskPilot User',
              participantId: currentUser?.id,
            }}
            token={videoSdkToken}
          >
            <VideoSdkRoom isHost={isHost} onLeave={handleLeaveMeeting} onEnd={handleEndMeeting} />
          </MeetingProvider>
        ) : (
          <div className="bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden min-h-0 relative">
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-white dark:bg-slate-900">
              <div>
                <Video className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">VideoSDK credentials are missing. Set VIDEOSDK_API_KEY and VIDEOSDK_SECRET_KEY on the backend.</p>
                {roomError && <p className="text-xs text-rose-500 mt-2">{roomError}</p>}
              </div>
            </div>
          </div>
        )}

        <aside className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Participants</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{activeParticipants.length} joined</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {participants.map(participant => (
              <div key={participant._id || participant.id} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${participant.leftAt ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                <Avatar name={participant.name} avatar={participant.avatar} className="h-9 w-9 text-[11px] border border-slate-200 dark:border-slate-700" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{participant.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${participant.role === 'Host' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {participant.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{participant.email}</p>
                  {participant.joinedAt && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {participant.leftAt ? 'Left' : 'Joined'} {new Date(participant.leftAt || participant.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {participants.length === 0 && (
              <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
                No participants have joined yet.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProjectMeeting;
