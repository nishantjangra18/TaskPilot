import { useMemo, useState } from 'react';
import { Briefcase, Camera, Check, CheckCircle2, Clock, Hash, Mail, Shield, User, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const getId = value => (value?._id || value?.id || value || '').toString();
const sameId = (a, b) => Boolean(a && b && getId(a) === getId(b));
const formatDate = value => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const shortId = value => {
  const id = getId(value);
  return id ? id.slice(-8).toUpperCase() : 'N/A';
};

const Profile = () => {
  const { currentUser, updateProfile, projects = [], tasks = [], meetings = [] } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [email] = useState(currentUser?.email || '');
  const [title, setTitle] = useState(currentUser?.title || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || '');
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const userId = getId(currentUser);
  const defaultAvatarUrl = currentUser?.name
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&size=128&background=random&font-size=0.4`
    : '';

  const accountInfo = useMemo(() => {
    const ownsProject = projects.some(project => sameId(project.owner || project.ownerId, userId));
    const workspaceRole = currentUser?.role || (ownsProject ? 'Owner' : 'Member');
    return [
      { label: 'Account Type', value: currentUser?.accountType || currentUser?.plan || 'Free', icon: Shield },
      { label: 'Member Since', value: formatDate(currentUser?.createdAt), icon: Clock },
      { label: 'Workspace Role', value: workspaceRole, icon: Briefcase },
      { label: 'Last Login', value: currentUser?.lastLogin ? formatDate(currentUser.lastLogin) : 'Current session', icon: CheckCircle2 },
      { label: 'User ID', value: shortId(currentUser), icon: Hash },
      { label: 'Email Verified', value: currentUser?.emailVerified ? 'Verified' : 'Not verified', icon: currentUser?.emailVerified ? CheckCircle2 : XCircle },
    ];
  }, [currentUser, projects, userId]);

  const activityStats = useMemo(() => {
    const joinedProjects = projects.filter(project => sameId(project.owner || project.ownerId, userId) || (project.members || []).some(member => sameId(member, userId))).length;
    const createdTasks = tasks.filter(task => sameId(task.createdBy || task.creator || task.authorId || task.userId, userId)).length;
    const hostedMeetings = meetings.filter(meeting => sameId(meeting.hostId, userId)).length;
    const completedDeadlines = tasks.filter(task => task.dueDate && task.status === 'done').length;
    return [
      { label: 'Projects Joined', value: joinedProjects },
      { label: 'Tasks Created', value: createdTasks },
      { label: 'Meetings Hosted', value: hostedMeetings },
      { label: 'Deadlines Completed', value: completedDeadlines },
    ];
  }, [projects, tasks, meetings, userId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedMessage('');
    setIsSaving(true);
    try {
      const res = await updateProfile({ name, email, title, avatar: selectedAvatar || null });
      if (res && res.success) setSavedMessage('Profile details updated successfully');
      else setErrorMsg(res?.message || 'Failed to update profile details');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit. Please upload a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setSelectedAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto text-left animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Profile</h1>
        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">Manage your personal account information.</p>
      </div>

      {savedMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-450 text-xs rounded-xl font-semibold flex items-center space-x-2">
          <Check className="h-4.5 w-4.5" />
          <span>{savedMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-xs transition-colors duration-200">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Profile Picture</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative group shrink-0">
                <img src={selectedAvatar || defaultAvatarUrl} alt="Profile preview" className="h-20 w-20 rounded-full object-cover border-2 border-violet-500 dark:border-violet-400 shadow-sm" />
                <label className="absolute inset-0 bg-black/45 hover:bg-black/60 rounded-full flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] text-slate-400 block font-medium">Click the photo to upload a custom profile picture (max 2MB).</span>
                <div className="flex gap-2">
                  <label className="px-3 py-1.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-100/30 dark:border-violet-900/40 rounded-lg cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors">
                    Upload Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {selectedAvatar && (
                    <button type="button" onClick={() => setSelectedAvatar('')} className="px-3 py-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors cursor-pointer">
                      Remove Picture
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-50 dark:border-slate-800/80 pt-4.5 space-y-4">
            <ProfileInput label="Display Name" icon={User} value={name} onChange={setName} required placeholder="Your Name" />
            <ProfileInput label="Job Title / Role" icon={Briefcase} value={title} onChange={setTitle} placeholder="e.g. Lead Designer" />
            <ProfileInput label="Email Address" icon={Mail} value={email} readOnly type="email" placeholder="email@example.com" />
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" disabled={isSaving} className={`px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors ${isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      <ReadOnlyCard title="Account Information" items={accountInfo} />

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-xs transition-colors duration-200">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Activity Summary</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {activityStats.map(stat => (
            <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const ProfileInput = ({ label, icon: Icon, value, onChange, readOnly = false, type = 'text', required = false, placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <input type={type} required={required} disabled={readOnly} value={value} onChange={readOnly ? undefined : (e) => onChange(e.target.value)} className={`w-full pl-10 pr-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg text-sm transition-colors ${readOnly ? 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 cursor-not-allowed select-none' : 'focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950'}`} placeholder={placeholder} />
    </div>
  </div>
);

const ReadOnlyCard = ({ title, items }) => (
  <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-xs transition-colors duration-200">
    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            <span className="mt-0.5 block truncate text-sm font-bold text-slate-800 dark:text-slate-100">{value}</span>
          </span>
        </div>
      ))}
    </div>
  </section>
);

export default Profile;
