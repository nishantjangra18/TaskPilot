import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Camera, Check, CheckCircle2, ChevronDown, Clock, Hash, Mail, Shield, Sparkles, User, X, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EXPERIENCE_LEVELS, PROFICIENCY_LEVELS, SKILL_CATALOG, SKILL_CATEGORIES, getCatalogCategory } from '../data/skillCatalog';

const MAX_SKILLS = 50;
const CAPACITY_OPTIONS = [20, 30, 40];

const getId = value => (value?._id || value?.id || value || '').toString();
const sameId = (a, b) => Boolean(a && b && getId(a) === getId(b));
const normalizeSkillName = value => value.trim().replace(/\s+/g, ' ');
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

const levelStyles = {
  Beginner: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/40',
  Intermediate: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40',
  Advanced: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/40',
  Expert: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40',
};

const Profile = () => {
  const { currentUser, updateProfile, projects = [], tasks = [], meetings = [] } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [email] = useState(currentUser?.email || '');
  const [title, setTitle] = useState(currentUser?.title || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || '');
  const [skills, setSkills] = useState(currentUser?.skills || []);
  const [capacity, setCapacity] = useState(currentUser?.capacity ?? 40);
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(currentUser?.name || '');
    setTitle(currentUser?.title || '');
    setSelectedAvatar(currentUser?.avatar || '');
    setSkills(currentUser?.skills || []);
    setCapacity(currentUser?.capacity ?? 40);
  }, [currentUser]);

  const userId = getId(currentUser);
  const skillCount = skills.length;
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
      const res = await updateProfile({ name, email, title, avatar: selectedAvatar || null, skills, capacity });
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

  const addSkill = (category, value) => {
    const skillName = normalizeSkillName(value);
    if (!skillName || skills.length >= MAX_SKILLS) return false;
    if (skills.some(skill => skill.name.toLowerCase() === skillName.toLowerCase())) return false;
    setSkills(current => [...current, {
      name: skillName,
      category,
      catalogCategory: getCatalogCategory(skillName),
      level: 'Intermediate',
      experience: '',
    }]);
    return true;
  };

  const updateSkill = (skillName, updates) => {
    setSkills(current => current.map(skill => skill.name === skillName ? { ...skill, ...updates } : skill));
  };

  const removeSkill = (skillName) => {
    setSkills(current => current.filter(skill => skill.name !== skillName));
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

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-xs transition-colors duration-200">
          <div className="space-y-5">
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
          </div>
        </div>

        <SkillsCard
          skills={skills}
          capacity={capacity}
          skillCount={skillCount}
          onCapacityChange={setCapacity}
          onAddSkill={addSkill}
          onUpdateSkill={updateSkill}
          onRemoveSkill={removeSkill}
        />

        <div className="flex justify-end">
          <button type="submit" disabled={isSaving} className={`px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors ${isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

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

const SkillsCard = ({ skills, capacity, skillCount, onCapacityChange, onAddSkill, onUpdateSkill, onRemoveSkill }) => (
  <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-xs transition-colors duration-200">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-400" />
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Skills & Expertise</h2>
        </div>
        <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">Build the professional profile future AI assignment will use for skill matching and workload balancing.</p>
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950/30">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skills</p>
        <p className="text-sm font-extrabold text-slate-900 dark:text-white">{skillCount}/{MAX_SKILLS}</p>
      </div>
    </div>

    <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Available Capacity</label>
      <div className="flex flex-wrap items-center gap-2">
        {CAPACITY_OPTIONS.map(option => (
          <button key={option} type="button" onClick={() => onCapacityChange(option)} className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${Number(capacity) === option ? 'border-violet-300 bg-violet-50 text-violet-600 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300' : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-violet-900'}`}>
            {option} hours/week
          </button>
        ))}
        <div className="relative">
          <input type="number" min="0" max="80" value={capacity} onChange={event => onCapacityChange(event.target.value)} className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-950" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">hrs</span>
        </div>
      </div>
    </div>

    <div className="mt-5 space-y-4">
      {SKILL_CATEGORIES.map(category => (
        <SkillCategoryEditor
          key={category}
          category={category}
          skills={skills.filter(skill => skill.category === category)}
          allSkills={skills}
          disabled={skillCount >= MAX_SKILLS}
          onAddSkill={onAddSkill}
          onUpdateSkill={onUpdateSkill}
          onRemoveSkill={onRemoveSkill}
        />
      ))}
    </div>
  </section>
);

const SkillCategoryEditor = ({ category, skills, allSkills, disabled, onAddSkill, onUpdateSkill, onRemoveSkill }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const existing = new Set(allSkills.map(skill => skill.name.toLowerCase()));
    return SKILL_CATALOG
      .filter(skill => skill.name.toLowerCase().includes(normalized) && !existing.has(skill.name.toLowerCase()))
      .slice(0, 8);
  }, [allSkills, query]);

  const commitSkill = (value = query) => {
    const created = onAddSkill(category, value);
    if (created) {
      setQuery('');
      setOpen(false);
      setActiveIndex(0);
    }
  };

  const handleKeyDown = event => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => Math.min(index + 1, suggestions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
      return;
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && query.trim()) {
      event.preventDefault();
      commitSkill(open && suggestions[activeIndex] ? suggestions[activeIndex].name : query);
      return;
    }
    if (event.key === ',' && query.trim()) {
      event.preventDefault();
      commitSkill(query.replace(',', ''));
      return;
    }
    if (event.key === 'Backspace' && !query && skills.length) {
      onRemoveSkill(skills[skills.length - 1].name);
    }
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/20">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{category}</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {skills.map(skill => (
          <SkillChip key={skill.name} skill={skill} onUpdate={onUpdateSkill} onRemove={onRemoveSkill} />
        ))}
        <div className="relative min-w-[180px] flex-1">
          <input
            value={query}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onChange={event => { setQuery(event.target.value.replace(',', '')); setOpen(true); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Skill limit reached' : `Add ${category.toLowerCase()}`}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-950"
          />
          {open && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-950/10 animate-in fade-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
              {suggestions.map((suggestion, index) => (
                <button key={suggestion.name} type="button" onMouseDown={event => { event.preventDefault(); commitSkill(suggestion.name); }} className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold transition-colors ${index === activeIndex ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/35 dark:text-violet-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'}`}>
                  <span>{suggestion.name}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{suggestion.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SkillChip = ({ skill, onUpdate, onRemove }) => (
  <div className="group flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition-all duration-150 animate-in fade-in zoom-in-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
    <span className="max-w-[140px] truncate">{skill.name}</span>
    <select value={skill.level || 'Intermediate'} onChange={event => onUpdate(skill.name, { level: event.target.value })} className={`rounded-md border px-1.5 py-1 text-[10px] font-black outline-none ${levelStyles[skill.level || 'Intermediate']}`}>
      {PROFICIENCY_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
    </select>
    <div className="relative">
      <select value={skill.experience || ''} onChange={event => onUpdate(skill.name, { experience: event.target.value })} className="appearance-none rounded-md border border-slate-100 bg-slate-50 py-1 pl-2 pr-6 text-[10px] font-black text-slate-500 outline-none focus:border-violet-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        {EXPERIENCE_LEVELS.map(level => <option key={level || 'none'} value={level}>{level || 'Exp'}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
    </div>
    <button type="button" onClick={() => onRemove(skill.name)} className="ml-0.5 rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30">
      <X className="h-3.5 w-3.5" />
    </button>
  </div>
);

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
