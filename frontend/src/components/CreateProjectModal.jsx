import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from './Avatar';
import { TaskPilotDatePicker } from './TaskPilotControls';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Check,
  Search,
  Loader2,
  Lock,
  Users as UsersIcon,
  Globe,
  Calendar,
  Sparkles
} from 'lucide-react';
import { getProjectIcon } from '../utils/iconHelper';

// â”€â”€ Icon Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const iconOptions = ['folder', 'rocket', 'laptop', 'smartphone', 'zap', 'target', 'barchart', 'gamepad', 'shoppingcart', 'palette', 'filetext', 'microscope', 'construction', 'globe', 'package', 'testtube', 'graduationcap', 'megaphone', 'sparkles', 'shield'];

// â”€â”€ Color Themes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const colorThemes = [
  { value: '#3b82f6', name: 'Blue', bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-950/30' },
  { value: '#8b5cf6', name: 'Purple', bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-950/30' },
  { value: '#10b981', name: 'Emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { value: '#f59e0b', name: 'Amber', bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-950/30' },
  { value: '#ef4444', name: 'Rose', bg: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-950/30' },
  { value: '#64748b', name: 'Slate', bg: 'bg-slate-500', light: 'bg-slate-100 dark:bg-slate-800/50' },
  { value: '#ec4899', name: 'Pink', bg: 'bg-pink-500', light: 'bg-pink-50 dark:bg-pink-950/30' },
  { value: '#06b6d4', name: 'Cyan', bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-950/30' },
];

// â”€â”€ Priority Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const priorities = [
  { id: 'low', label: 'Low', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400' },
  { id: 'medium', label: 'Medium', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  { id: 'high', label: 'High', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { id: 'critical', label: 'Critical', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
];

// â”€â”€ Visibility Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const visibilityOptions = [
  { id: 'private', label: 'Private', icon: Lock, desc: 'Only you can access' },
  { id: 'team', label: 'Team', icon: UsersIcon, desc: 'All team members' },
  { id: 'public', label: 'Public', icon: Globe, desc: 'Anyone with the link' },
];

const CreateProjectModal = ({ isOpen, onClose }) => {
  const { addProject, currentUser, networkConnections = [] } = useApp();
  const navigate = useNavigate();
  const nameInputRef = useRef(null);
  const modalRef = useRef(null);

  // â”€â”€ Form State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const [icon, setIcon] = useState('folder');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  // â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const nameError = nameTouched
    ? name.trim().length === 0
      ? 'Project name is required'
      : name.trim().length < 3
        ? 'Minimum 3 characters required'
        : null
    : null;

  const isValid = name.trim().length >= 3;

  // â”€â”€ Member filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const projectMemberSource = networkConnections;
  const availableMembers = projectMemberSource.filter(u => {
    const query = memberSearch.trim().toLowerCase();
    if (query.length < 3) return false;

    const uId = u._id || u.id;
    return uId !== currentUser?.id &&
      !selectedMembers.includes(uId) &&
      (u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query));
  });

  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
    setMemberSearch('');
  };

  // â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    const proj = await addProject({
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      priority,
      deadline: deadline || null,
      visibility,
      members: selectedMembers,
    });
    setIsSubmitting(false);
    resetForm();
    onClose();
    if (proj && (proj._id || proj.id)) {
      navigate(`/projects/${proj._id || proj.id}`);
    }
  };

  const resetForm = () => {
    setIcon('folder');
    setName('');
    setDescription('');
    setColor('#3b82f6');
    setPriority('medium');
    setDeadline('');
    setVisibility('private');
    setSelectedMembers([]);
    setMemberSearch('');
    setNameTouched(false);
    setShowIconPicker(false);
  };

  // â”€â”€ Keyboard / Focus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => nameInputRef.current?.focus(), 200);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // â”€â”€ Click outside â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 flex items-center justify-center p-3 md:p-6 z-[10000]"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-[#ffffff] dark:bg-slate-900 rounded-2xl w-full max-w-[660px] max-h-[92vh] shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
      >
        {/* â•â•â• Header â•â•â• */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Create New Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* â•â•â• Body â•â•â• */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* â”€â”€ Project Icon + Name â”€â”€ */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2.5">
              {/* Icon Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-lg hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all cursor-pointer shrink-0"
                  title="Choose icon"
                >
                  {getProjectIcon(icon, { className: "h-5 w-5 text-slate-700 dark:text-slate-350" })}
                </button>
                {showIconPicker && (
                  <div className="absolute top-12 left-0 bg-[#ffffff] dark:bg-slate-800 border border-slate-150 dark:border-slate-750 rounded-xl shadow-xl z-50 p-2.5 w-[220px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="grid grid-cols-5 gap-1.5">
                      {iconOptions.map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => { setIcon(ic); setShowIconPicker(false); }}
                          className={`h-9 w-9 rounded-lg flex items-center justify-center cursor-pointer transition-all ${icon === ic
                              ? 'bg-violet-50 dark:bg-violet-950/40 ring-2 ring-violet-400 dark:ring-violet-600 scale-110'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105'
                            }`}
                        >
                          {getProjectIcon(ic, { className: "h-4 w-4 text-slate-600 dark:text-slate-400" })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Name Input */}
              <div className="flex-1 relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g. TaskPilot Rebuild"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  maxLength={60}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 transition-all bg-[#ffffff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 ${nameError
                      ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-100 dark:focus:ring-rose-950 focus:border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500'
                    }`}
                />
                <span className="absolute right-3 top-3 text-[9px] font-bold text-slate-300 dark:text-slate-600 select-none">{name.length}/60</span>
              </div>
            </div>
            {nameError && (
              <p className="text-[10px] text-rose-500 font-semibold mt-1.5 ml-[52px]">{nameError}</p>
            )}
          </div>

          {/* â”€â”€ Description â”€â”€ */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Description
            </label>
            <div className="relative">
              <textarea
                placeholder="Describe the project's purpose, goals, and expected outcomes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500 bg-[#ffffff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 h-20 resize-none transition-all"
              />
              <span className="absolute right-3 bottom-2.5 text-[9px] font-bold text-slate-300 dark:text-slate-600 select-none">
                {description.length} / 300
              </span>
            </div>
          </div>

          {/* â”€â”€ Priority + Deadline (side by side) â”€â”€ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Priority */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                Priority
              </label>
              <div className="flex flex-wrap gap-1.5">
                {priorities.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer text-[11px] font-bold ${priority === p.id
                        ? `bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 ${p.text} shadow-xs`
                        : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                Deadline
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <TaskPilotDatePicker
                  value={deadline}
                  onChange={setDeadline}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              {!deadline && (
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium">No deadline selected</p>
              )}
            </div>
          </div>

          {/* â”€â”€ Team Members â”€â”€ */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Assign Team Members
            </label>

            {/* Selected Chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {selectedMembers.map(mId => {
                  const member = projectMemberSource.find(u => (u._id || u.id) === mId);
                  if (!member) return null;
                  return (
                    <span
                      key={mId}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[10px] font-bold text-blue-700 dark:text-blue-300"
                    >
                      <Avatar name={member.name} avatar={member.avatar} className="h-5 w-5 text-[7px]" />
                      {member.name}
                      <button
                        type="button"
                        onClick={() => toggleMember(mId)}
                        className="ml-0.5 text-blue-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search accepted connections..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950 focus:border-blue-500 bg-[#ffffff] dark:bg-slate-950 text-slate-700 dark:text-slate-300 placeholder-slate-400 transition-all"
              />
            </div>
            {memberSearch.trim().length >= 3 && availableMembers.length > 0 && (
              <div className="mt-1.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-[#ffffff] dark:bg-slate-900 shadow-lg max-h-32 overflow-y-auto">
                {availableMembers.slice(0, 5).map(u => {
                  const uId = u._id || u.id;
                  return (
                    <button
                      key={uId}
                      type="button"
                      onClick={() => toggleMember(uId)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                    >
                      <Avatar name={u.name} avatar={u.avatar} className="h-6 w-6 text-[8px] border border-slate-100 dark:border-slate-800" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-slate-880 dark:text-slate-200 block truncate">{u.name}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">{u.title || 'Team Member'}</span>
                      </div>
                      <span className="text-[9px] font-bold text-blue-500 uppercase">Add</span>
                    </button>
                  );
                })}
              </div>
            )}
            {memberSearch.trim().length >= 3 && availableMembers.length === 0 && (
              <p className="text-[9px] text-slate-400 mt-1.5 font-medium">No matching user found</p>
            )}
          </div>

          {/* â”€â”€ Color Theme â”€â”€ */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
              Project Theme
            </label>
            <div className="flex flex-wrap gap-2">
              {colorThemes.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setColor(ct.value)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer text-[11px] font-bold ${color === ct.value
                      ? `${ct.light} border-current shadow-xs`
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
                    }`}
                  style={color === ct.value ? { color: ct.value, borderColor: `${ct.value}40` } : {}}
                >
                  <span className={`h-3 w-3 rounded-full ${ct.bg}`} />
                  <span>{ct.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* â”€â”€ Visibility â”€â”€ */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {visibilityOptions.map((v) => {
                const VIcon = v.icon;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVisibility(v.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${visibility === v.id
                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                  >
                    <VIcon className={`h-3.5 w-3.5 shrink-0 ${visibility === v.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <div className="text-left min-w-0">
                      <span className={`text-[10px] font-bold block ${visibility === v.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
                        {v.label}
                      </span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 block truncate">{v.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* â•â•â• Footer â•â•â• */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 shrink-0">
          <button
            type="button"
            onClick={() => { resetForm(); onClose(); }}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all duration-200 flex items-center gap-2 cursor-pointer ${isValid && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md active:scale-[0.97]'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Create Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
