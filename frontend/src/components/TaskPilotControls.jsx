import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const controlBaseClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-hidden transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-violet-950';
const datePanelClass = 'fixed z-[10080] overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#17171c] text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,.55)] animate-in fade-in zoom-in-95 duration-150';
const solidPanelClass = 'z-[10020] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 animate-in fade-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40';
const pad = value => String(value).padStart(2, '0');
const toDateValue = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDateValue = value => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};
const clampMonth = date => new Date(date.getFullYear(), date.getMonth(), 1);
const optionParts = option => Array.isArray(option) ? { value: option[0], label: option[1], icon: option[2] } : option;

const useOutsideClose = (open, onClose) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, onClose]);
  return ref;
};

export const TaskPilotSelect = ({ value, onChange, options, disabled = false, className = '', placeholder = 'Select', searchable = false, renderValue, renderOption, portal = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const normalized = useMemo(() => options.map(optionParts), [options]);
  const selected = normalized.find(option => String(option.value) === String(value));
  const filtered = normalized.filter(option => !query || String(option.label).toLowerCase().includes(query.toLowerCase()));
  const selectedContent = selected ? (renderValue ? renderValue(selected) : <span className="truncate">{selected.label}</span>) : <span className="truncate text-slate-400">{placeholder}</span>;

  const updatePosition = () => {
    if (!portal) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8;
    const panelHeight = Math.min(280, 44 + filtered.length * 38 + (searchable ? 42 : 0));
    const openUp = window.innerHeight - rect.bottom < panelHeight + gap && rect.top > panelHeight + gap;
    setPosition({
      top: openUp ? Math.max(gap, rect.top - panelHeight - gap) : Math.min(rect.bottom + gap, window.innerHeight - panelHeight - gap),
      left: Math.min(Math.max(gap, rect.left), window.innerWidth - rect.width - gap),
      width: rect.width,
    });
  };

  const choose = option => {
    if (disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handlePointerDown = event => {
      if (wrapperRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, portal, filtered.length, searchable]);

  const handleKeyDown = event => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) setOpen(true);
      else if (filtered[activeIndex]) choose(filtered[activeIndex]);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const panel = open && <div ref={panelRef} className={`${solidPanelClass} ${portal ? 'fixed z-[10090]' : 'absolute left-0 right-0 mt-2'} p-1.5`} style={portal ? { top: position.top, left: position.left, width: position.width } : undefined}>
    {searchable && <input autoFocus value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }} className="mb-1.5 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold outline-hidden focus:border-violet-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" placeholder="Search..." />}
    <div className="max-h-60 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#7c3aed_#16161d]">
      {filtered.length ? filtered.map((option, index) => {
        const isSelected = String(option.value) === String(value);
        const content = renderOption ? renderOption(option) : <span className="truncate">{option.label}</span>;
        return <button key={option.value} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors ${isSelected ? 'bg-violet-600 text-white' : index === activeIndex ? 'bg-violet-50 text-violet-700 dark:bg-slate-800 dark:text-violet-200' : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-violet-200'}`}>
          <span className="flex min-w-0 items-center gap-2">{content}</span>
          {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
        </button>;
      }) : <div className="px-3 py-4 text-center text-xs font-semibold text-slate-400">No options found</div>}
    </div>
  </div>;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button ref={buttonRef} type="button" disabled={disabled} onClick={() => setOpen(prev => { const next = !prev; if (next) setActiveIndex(0); return next; })} onKeyDown={handleKeyDown} className={`${controlBaseClass} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}>
        <span className="flex min-w-0 items-center gap-2">{selectedContent}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-violet-500 dark:text-violet-300' : ''}`} />
      </button>
      {portal ? createPortal(panel, document.body) : panel}
    </div>
  );
};
export const TaskPilotDatePicker = ({ value, onChange, required = false, min, className = '' }) => {
  const selectedDate = parseDateValue(value);
  const minDate = parseDateValue(min);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [cursor, setCursor] = useState(() => clampMonth(selectedDate || minDate || new Date()));
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const todayValue = toDateValue(new Date());
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const years = Array.from({ length: 15 }, (_, index) => cursor.getFullYear() - 7 + index);
  const monthOptions = Array.from({ length: 12 }, (_, month) => [month, new Date(2020, month, 1).toLocaleDateString(undefined, { month: 'short' })]);
  const yearOptions = years.map(year => [year, String(year)]);
  const display = selectedDate ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date';

  const selectDay = day => {
    const next = toDateValue(day);
    if (minDate && day < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return;
    onChange(next);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = 292;
      const panelHeight = 306;
      const gap = 8;
      const openUp = window.innerHeight - rect.bottom < panelHeight + gap && rect.top > panelHeight + gap;
      setPosition({
        top: openUp ? Math.max(gap, rect.top - panelHeight - gap) : Math.min(rect.bottom + gap, window.innerHeight - panelHeight - gap),
        left: Math.min(Math.max(gap, rect.left), window.innerWidth - panelWidth - gap),
      });
    };
    updatePosition();
    const handlePointerDown = event => {
      if (buttonRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const calendarPanel = open && createPortal(
    <div ref={panelRef} className={`${datePanelClass} w-[292px] p-3`} style={{ top: position.top, left: position.left }}>
      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-violet-400 hover:text-violet-600 dark:border-slate-800 dark:text-slate-300 dark:hover:border-violet-700"><ChevronLeft className="h-4 w-4" /></button>
        <TaskPilotSelect value={cursor.getMonth()} onChange={month => setCursor(new Date(cursor.getFullYear(), Number(month), 1))} options={monthOptions} className="flex-1" />
        <TaskPilotSelect value={cursor.getFullYear()} onChange={year => setCursor(new Date(Number(year), cursor.getMonth(), 1))} options={yearOptions} className="w-24" />
        <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-violet-400 hover:text-violet-600 dark:border-slate-800 dark:text-slate-300 dark:hover:border-violet-700"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map(day => {
          const dayValue = toDateValue(day);
          const muted = day.getMonth() !== cursor.getMonth();
          const selected = value === dayValue;
          const today = todayValue === dayValue;
          const disabled = minDate && day < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
          return <button key={dayValue} type="button" disabled={disabled} onClick={() => selectDay(day)} className={`flex h-8 items-center justify-center rounded-xl text-xs font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-30 ${selected ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25' : today ? 'border border-violet-500 text-violet-600 dark:text-violet-300' : muted ? 'text-slate-300 hover:bg-violet-50 dark:text-slate-700 dark:hover:bg-violet-950/30' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-950/40 dark:hover:text-violet-200'}`}>{day.getDate()}</button>;
        })}
      </div>
    </div>,
    document.body
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button ref={buttonRef} type="button" aria-required={required} onClick={() => setOpen(prev => !prev)} className={`${controlBaseClass} flex items-center justify-between gap-2 text-left`}>
        <span className={`${selectedDate ? '' : 'text-slate-400'} truncate`}>{display}</span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-200" />
      </button>
      {calendarPanel}
    </div>
  );
};

export const TaskPilotTimePicker = ({ value, onChange, required = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useOutsideClose(open, () => setOpen(false));
  const buttonRef = useRef(null);
  const [hourValue = '', minuteValue = ''] = (value || '').split(':');
  const display = value ? new Date(`2020-01-01T${value}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Select time';
  const choose = (hour, minute) => onChange(`${pad(hour)}:${pad(minute)}`);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = Array.from({ length: 12 }, (_, index) => index * 5);

  useEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelHeight = 224;
      const panelWidth = 220;
      const gap = 8;
      const openUp = window.innerHeight - rect.bottom < panelHeight + gap && rect.top > panelHeight + gap;
      setPosition({
        top: openUp ? Math.max(gap, rect.top - panelHeight - gap) : rect.bottom + gap,
        left: Math.min(Math.max(gap, rect.left), window.innerWidth - panelWidth - gap),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button ref={buttonRef} type="button" aria-required={required} onClick={() => setOpen(prev => !prev)} className={`${controlBaseClass} flex items-center justify-between gap-2 text-left`}>
        <span className={`${value ? '' : 'text-slate-400'} truncate`}>{display}</span>
        <Clock className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-200" />
      </button>
      {open && <div className={`${solidPanelClass} fixed w-[220px] p-2`} style={{ top: position.top, left: position.left }}>
        <div className="grid grid-cols-2 gap-2">
          <div className="max-h-48 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#7c3aed_#16161d]">{hours.map(hour => <button key={hour} type="button" onClick={() => choose(hour, Number(minuteValue || 0))} className={`mb-1 flex h-8 w-full items-center justify-center rounded-xl text-xs font-bold transition-colors ${Number(hourValue) === hour ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-violet-50 dark:text-slate-100 dark:hover:bg-slate-800'}`}>{pad(hour)}</button>)}</div>
          <div className="max-h-48 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#7c3aed_#16161d]">{minutes.map(minute => <button key={minute} type="button" onClick={() => choose(Number(hourValue || 0), minute)} className={`mb-1 flex h-8 w-full items-center justify-center rounded-xl text-xs font-bold transition-colors ${Number(minuteValue) === minute ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-violet-50 dark:text-slate-100 dark:hover:bg-slate-800'}`}>{pad(minute)}</button>)}</div>
        </div>
      </div>}
    </div>
  );
};








