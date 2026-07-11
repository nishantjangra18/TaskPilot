import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Check, Mail, MessageSquare, Search, Send, Sparkles, UserCheck, UserRoundPlus, Users, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useApp } from '../context/AppContext';

const tabs = [
  { id: 'network', label: 'My Network', icon: Users },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'requests', label: 'Requests', icon: UserRoundPlus },
  { id: 'suggestions', label: 'Suggestions', icon: Sparkles },
];

const availabilityStyles = {
  available: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/25 dark:text-emerald-300 dark:border-emerald-900/40',
  busy: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-900/40',
  dnd: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/25 dark:text-rose-300 dark:border-rose-900/40',
  offline: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
};

const availabilityLabels = {
  available: 'Available',
  busy: 'Busy',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

const getId = value => (value?._id || value?.id || value || '').toString();
const formatDate = value => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const Network = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    projects = [],
    networkConnections = [],
    incomingConnectionRequests = [],
    outgoingConnectionRequests = [],
    networkSuggestions = [],
    refreshNetwork,
    discoverNetworkUsers,
    sendConnectionRequest,
    acceptConnectionRequest,
    declineConnectionRequest,
    cancelConnectionRequest,
    startDirectChat,
    setActiveMessageConversationId,
    sendInvitation,
  } = useApp();

  const [activeTab, setActiveTab] = useState('network');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [highlightedRequestId, setHighlightedRequestId] = useState('');

  const ownedProjects = useMemo(() => projects.filter(project => getId(project.owner) === getId(currentUser)), [projects, currentUser]);
  const pendingIncomingRequestCount = incomingConnectionRequests.length;

  useEffect(() => {
    refreshNetwork?.();
  }, []);

  useEffect(() => {
    if (location.state?.networkTab === 'requests') {
      setActiveTab('requests');
      setHighlightedRequestId(location.state?.connectionId || location.state?.requestId || '');
      window.setTimeout(() => setHighlightedRequestId(''), 3500);
    }
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();
    if (activeTab !== 'discover' || trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    const timer = window.setTimeout(async () => {
      const users = await discoverNetworkUsers(trimmed);
      if (!cancelled) {
        setResults(users);
        setSearching(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, query, discoverNetworkUsers]);

  const runAction = async (key, action, successMessage) => {
    setBusyAction(key);
    setError('');
    setNotice('');
    try {
      const result = await action();
      if (successMessage) setNotice(successMessage);
      return result;
    } catch (err) {
      setError(err.message || 'Something went wrong');
      return null;
    } finally {
      setBusyAction('');
    }
  };

  const handleConnect = (user) => runAction(`connect-${getId(user)}`, async () => {
    await sendConnectionRequest(getId(user));
    setResults(current => current.filter(item => getId(item) !== getId(user)));
  }, 'Connection request sent');

  const handleMessage = (user) => runAction(`message-${getId(user)}`, async () => {
    const conversation = await startDirectChat(getId(user));
    if (conversation?._id) setActiveMessageConversationId(conversation._id);
    navigate('/messages');
  });

  const handleInvite = (user, projectId) => runAction(`invite-${getId(user)}-${projectId}`, async () => {
    await sendInvitation(projectId, getId(user));
    setInviteTarget(null);
  }, 'Project invitation sent');

  const renderContent = () => {
    if (activeTab === 'network') {
      return networkConnections.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {networkConnections.map(user => (
            <ConnectionCard
              key={getId(user)}
              user={user}
              busyAction={busyAction}
              onMessage={handleMessage}
              onProfile={setSelectedProfile}
              onInvite={() => setInviteTarget(user)}
            />
          ))}
        </div>
      ) : <EmptyState icon={Users} title="No connections yet" text="Search Discover or review Suggestions to build your network." />;
    }

    if (activeTab === 'discover') {
      return (
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search by name, username, email, skill, role, or technology"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-950"
            />
          </div>
          {query.trim().length < 2 ? <EmptyState icon={Search} title="Search your professional graph" text="Try React, Node, MongoDB, Python, UI Design, Figma, or AI." /> : null}
          {searching ? <StatusLine text="Searching..." /> : null}
          {!searching && query.trim().length >= 2 && !results.length ? <EmptyState icon={UserRoundPlus} title="No matching user found" text="Try a different name, role, email, or technology." /> : null}
          <div className="grid gap-4 xl:grid-cols-2">
            {results.map(user => (
              <DiscoveryCard key={getId(user)} user={user} busyAction={busyAction} onConnect={handleConnect} onProfile={setSelectedProfile} />
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'requests') {
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <RequestColumn title="Incoming Requests" items={incomingConnectionRequests} empty="No incoming requests" renderItem={request => (
            <RequestCard
              key={request._id}
              request={request}
              busyAction={busyAction}
              primaryLabel="Accept"
              secondaryLabel="Decline"
              onPrimary={() => runAction(`accept-${request._id}`, () => acceptConnectionRequest(request._id), 'Connection accepted')}
              onSecondary={() => runAction(`decline-${request._id}`, () => declineConnectionRequest(request._id), 'Connection declined')}
              highlight={highlightedRequestId === getId(request)}
              onProfile={setSelectedProfile}
            />
          )} />
          <RequestColumn title="Outgoing Requests" items={outgoingConnectionRequests} empty="No outgoing requests" renderItem={request => (
            <RequestCard
              key={request._id}
              request={request}
              busyAction={busyAction}
              primaryLabel="Pending"
              secondaryLabel="Cancel Request"
              primaryDisabled
              onSecondary={() => runAction(`cancel-${request._id}`, () => cancelConnectionRequest(request._id), 'Request cancelled')}
              highlight={highlightedRequestId === getId(request)}
              onProfile={setSelectedProfile}
            />
          )} />
        </div>
      );
    }

    return networkSuggestions.length ? (
      <div className="grid gap-4 xl:grid-cols-2">
        {networkSuggestions.map(user => (
          <DiscoveryCard key={getId(user)} user={user} busyAction={busyAction} onConnect={handleConnect} onProfile={setSelectedProfile} reason={user.recommendationReason} />
        ))}
      </div>
    ) : <EmptyState icon={Sparkles} title="No suggestions yet" text="Add skills to your profile to improve recommendations." />;
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400">
            <UserCheck className="h-4 w-4" />
            Professional Network
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-3xl">Network</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-400 dark:text-slate-500">Collaborate through accepted professional connections.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          <Stat label="Connections" value={networkConnections.length} />
          <Stat label="Incoming" value={incomingConnectionRequests.length} />
          <Stat label="Outgoing" value={outgoingConnectionRequests.length} />
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-colors ${active ? 'bg-violet-600 text-white shadow-sm shadow-violet-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'}`}>
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'requests' && pendingIncomingRequestCount > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingIncomingRequestCount > 99 ? '99+' : pendingIncomingRequestCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {notice ? <Alert tone="success" text={notice} /> : null}
      {error ? <Alert tone="error" text={error} /> : null}

      {renderContent()}

      {selectedProfile ? <ProfilePreview user={selectedProfile} onClose={() => setSelectedProfile(null)} /> : null}
      {inviteTarget ? <InvitePanel user={inviteTarget} projects={ownedProjects} busyAction={busyAction} onInvite={handleInvite} onClose={() => setInviteTarget(null)} /> : null}
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="min-w-[84px] rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-950/40">
    <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
  </div>
);

const SkillList = ({ skills = [] }) => (
  <div className="flex flex-wrap gap-1.5">
    {(skills || []).slice(0, 5).map(skill => <span key={skill} className="rounded-lg border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-600 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300">{skill}</span>)}
    {!skills?.length ? <span className="text-xs font-semibold text-slate-400">No skills listed</span> : null}
  </div>
);

const Availability = ({ value }) => <span className={`rounded-lg border px-2 py-1 text-[10px] font-extrabold ${availabilityStyles[value] || availabilityStyles.available}`}>{availabilityLabels[value] || 'Available'}</span>;

const ProfileShell = ({ user, children }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/20">
    <div className="flex items-start gap-3">
      <Avatar name={user.name} avatar={user.avatar} className="h-12 w-12 text-sm border border-slate-200 dark:border-slate-700" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{user.name}</h3>
          <Availability value={user.availability} />
        </div>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">@{user.username || 'user'}</p>
        <p className="mt-1 truncate text-xs font-bold text-slate-600 dark:text-slate-300">{user.role || user.title || 'Contributor'}</p>
      </div>
    </div>
    {children}
  </div>
);

const ConnectionCard = ({ user, busyAction, onMessage, onProfile, onInvite }) => (
  <ProfileShell user={user}>
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
      <MiniMetric label="Workload" value={`${user.workload || 0}%`} />
      <MiniMetric label="Connected" value={formatDate(user.connectionSince)} />
      <MiniMetric label="Completed" value={user.completedTasks || 0} />
      <MiniMetric label="Reliability" value={`${user.reliabilityScore || 92}%`} />
    </div>
    <div className="mt-4"><SkillList skills={user.topSkills} /></div>
    <div className="mt-4 flex flex-wrap gap-2">
      <ActionButton icon={MessageSquare} label="Message" busy={busyAction === `message-${getId(user)}`} onClick={() => onMessage(user)} />
      <ActionButton icon={UserCheck} label="View Profile" variant="soft" onClick={() => onProfile(user)} />
      <ActionButton icon={Send} label="Invite to Project" variant="soft" onClick={onInvite} />
    </div>
  </ProfileShell>
);

const DiscoveryCard = ({ user, busyAction, onConnect, onProfile, reason }) => (
  <ProfileShell user={user}>
    <div className="mt-4 space-y-3">
      <SkillList skills={user.topSkills} />
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
        <span>{user.mutualConnections || 0} mutual connections</span>
        {reason ? <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{reason}</span> : null}
      </div>
      <div className="flex gap-2">
        <ActionButton icon={UserRoundPlus} label="Connect" busy={busyAction === `connect-${getId(user)}`} onClick={() => onConnect(user)} />
        <ActionButton icon={UserCheck} label="View Profile" variant="soft" onClick={() => onProfile(user)} />
      </div>
    </div>
  </ProfileShell>
);

const RequestColumn = ({ title, items, empty, renderItem }) => (
  <section className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h2>
    <div className="mt-4 space-y-3">
      {items.length ? items.map(renderItem) : <EmptyState compact icon={UserRoundPlus} title={empty} text="" />}
    </div>
  </section>
);

const RequestCard = ({ request, busyAction, primaryLabel, secondaryLabel, primaryDisabled, highlight, onPrimary, onSecondary, onProfile }) => {
  const user = request.user;
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/35 ${highlight ? 'ring-2 ring-violet-400/70' : ''}`}>
      <div className="flex gap-3">
        <Avatar name={user.name} avatar={user.avatar} className="h-10 w-10 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{user.name}</p>
          <p className="truncate text-xs font-semibold text-slate-400">@{user.username || 'user'} · {user.role}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Sent {formatDate(request.sentAt || request.createdAt)} · {request.status || 'pending'}</p>
          {request.message ? <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{request.message}</p> : null}
          <div className="mt-3"><SkillList skills={user.topSkills} /></div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton icon={Check} label={primaryLabel} disabled={primaryDisabled} busy={busyAction === `accept-${request._id}`} onClick={onPrimary} />
        <ActionButton icon={X} label={secondaryLabel} variant="soft" busy={busyAction === `decline-${request._id}` || busyAction === `cancel-${request._id}`} onClick={onSecondary} />
        <ActionButton icon={UserCheck} label="View Profile" variant="ghost" onClick={() => onProfile(user)} />
      </div>
    </div>
  );
};

const MiniMetric = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/35">
    <p className="text-sm font-black text-slate-900 dark:text-white">{value}</p>
    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
  </div>
);

const ActionButton = ({ icon: Icon, label, variant = 'primary', busy, disabled, onClick }) => {
  const classes = variant === 'primary'
    ? 'bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-400'
    : variant === 'ghost'
      ? 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
      : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-800 dark:hover:text-violet-300';
  return <button disabled={busy || disabled} onClick={onClick} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${classes}`}><Icon className="h-3.5 w-3.5" />{busy ? 'Working...' : label}</button>;
};

const EmptyState = ({ icon: Icon, title, text, compact }) => (
  <div className={`rounded-2xl border border-dashed border-slate-200 bg-white text-center dark:border-slate-800 dark:bg-slate-900 ${compact ? 'p-5' : 'p-10'}`}>
    <Icon className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" />
    <p className="mt-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">{title}</p>
    {text ? <p className="mt-1 text-xs font-medium text-slate-400">{text}</p> : null}
  </div>
);

const StatusLine = ({ text }) => <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900">{text}</div>;

const Alert = ({ tone, text }) => (
  <div className={`rounded-xl border px-4 py-3 text-xs font-bold ${tone === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300'}`}>{text}</div>
);

const ProfilePreview = ({ user, onClose }) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} avatar={user.avatar} className="h-14 w-14 text-base" />
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{user.name}</h2>
            <p className="text-xs font-semibold text-slate-400">@{user.username}</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniMetric label="Role" value={user.role || 'Contributor'} />
        <MiniMetric label="Availability" value={availabilityLabels[user.availability] || 'Available'} />
        <MiniMetric label="Projects" value={user.projects || 0} />
        <MiniMetric label="Workload" value={`${user.workload || 0}%`} />
        <MiniMetric label="Completed" value={user.completedTasks || 0} />
        <MiniMetric label="Reliability" value={`${user.reliabilityScore || 92}%`} />
      </div>
      <div className="mt-5"><SkillList skills={user.topSkills} /></div>
      <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-400"><Mail className="h-4 w-4" />{user.email}</div>
    </div>
  </div>
);

const InvitePanel = ({ user, projects, busyAction, onInvite, onClose }) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={event => event.stopPropagation()}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Invite {user.name}</h2>
          <p className="text-xs font-semibold text-slate-400">Choose one of your owned projects.</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-5 space-y-2">
        {projects.length ? projects.map(project => (
          <button key={getId(project)} onClick={() => onInvite(user, getId(project))} disabled={busyAction === `invite-${getId(user)}-${getId(project)}`} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-violet-200 hover:bg-violet-50 dark:border-slate-800 dark:bg-slate-950/35 dark:hover:border-violet-900/50 dark:hover:bg-violet-950/20">
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold text-slate-900 dark:text-white">{project.name}</span>
              <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-400"><Briefcase className="h-3.5 w-3.5" />{(project.members || []).length} members</span>
            </span>
            <Send className="h-4 w-4 text-violet-500" />
          </button>
        )) : <EmptyState compact icon={Briefcase} title="No owned projects" text="" />}
      </div>
    </div>
  </div>
);

export default Network;
