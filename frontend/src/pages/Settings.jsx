import { useState } from 'react';
import { Bell, CalendarDays, Clock, LayoutGrid, Monitor, Palette, Settings as SettingsIcon, Sparkles, XCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeProvider';
import { GoogleLabel } from '../components/GoogleBranding';
import { TaskPilotSelect } from '../components/TaskPilotControls';
import {
  buildGoogleAuthUrl,
  GOOGLE_EMAIL_KEY,
  GOOGLE_EVENTS_KEY,
  GOOGLE_OAUTH_STATUS_KEY,
  GOOGLE_SYNC_KEY,
  GOOGLE_SYNCED_AT_KEY,
  GOOGLE_SYNCED_IDS_KEY,
  GOOGLE_TOKEN_KEY,
} from '../config/googleCalendarOAuth';

const boolFromStorage = (key, fallback) => {
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  return stored === 'true';
};

const useStoredValue = (key, fallback) => {
  const [value, setValueState] = useState(() => localStorage.getItem(key) || fallback);
  const setValue = (next) => {
    setValueState(next);
    localStorage.setItem(key, next);
  };
  return [value, setValue];
};

const useStoredBoolean = (key, fallback) => {
  const [value, setValueState] = useState(() => boolFromStorage(key, fallback));
  const setValue = (next) => {
    setValueState(next);
    localStorage.setItem(key, String(next));
  };
  return [value, setValue];
};

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [googleConnected, setGoogleConnected] = useState(() => Boolean(localStorage.getItem(GOOGLE_TOKEN_KEY)));
  const [googleEmail, setGoogleEmail] = useState(() => localStorage.getItem(GOOGLE_EMAIL_KEY) || '');
  const [lastSyncedAt, setLastSyncedAt] = useState(() => localStorage.getItem(GOOGLE_SYNCED_AT_KEY) || '');
  const [settingsMessage, setSettingsMessage] = useState('');

  const [syncMeetings, setSyncMeetings] = useStoredBoolean('taskpilot_google_sync_meetings', boolFromStorage(GOOGLE_SYNC_KEY, true));
  const [syncDeadlines, setSyncDeadlines] = useStoredBoolean('taskpilot_google_sync_deadlines', true);
  const [importGoogleEvents, setImportGoogleEvents] = useStoredBoolean('taskpilot_google_import_events', Boolean(localStorage.getItem(GOOGLE_EVENTS_KEY)));

  const [desktopNotifications, setDesktopNotifications] = useStoredBoolean('taskpilot_desktop_notifications', true);
  const [meetingReminders, setMeetingReminders] = useStoredBoolean('taskpilot_meeting_reminders', true);
  const [deadlineReminders, setDeadlineReminders] = useStoredBoolean('taskpilot_deadline_reminders', true);
  const [taskAssignmentNotifications, setTaskAssignmentNotifications] = useStoredBoolean('taskpilot_task_assignment_notifications', true);
  const [emailNotifications, setEmailNotifications] = useStoredBoolean('taskpilot_email_notifications', false);

  const [accentColor, setAccentColor] = useStoredValue('taskpilot_accent_color', 'violet');
  const [compactMode, setCompactMode] = useStoredBoolean('taskpilot_compact_mode', false);
  const [reduceAnimations, setReduceAnimations] = useStoredBoolean('taskpilot_reduce_animations', false);

  const [defaultView, setDefaultView] = useStoredValue('taskpilot_calendar_view', 'week');
  const [firstDayOfWeek, setFirstDayOfWeek] = useStoredValue('taskpilot_calendar_first_day', 'monday');
  const [timeFormat, setTimeFormat] = useStoredValue('taskpilot_calendar_time_format', '12-hour');
  const [showCurrentTime, setShowCurrentTime] = useStoredBoolean('taskpilot_calendar_show_current_time', true);
  const [autoScrollCurrentTime, setAutoScrollCurrentTime] = useStoredBoolean('taskpilot_calendar_auto_scroll_current_time', true);

  const connectGoogle = () => {
    const authUrl = buildGoogleAuthUrl();
    if (!authUrl) {
      setSettingsMessage('Add VITE_GOOGLE_CLIENT_ID to connect Google Calendar.');
      return;
    }
    window.location.href = authUrl;
  };

  const disconnectGoogle = () => {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_EVENTS_KEY);
    localStorage.removeItem(GOOGLE_SYNC_KEY);
    localStorage.removeItem(GOOGLE_SYNCED_IDS_KEY);
    localStorage.removeItem(GOOGLE_SYNCED_AT_KEY);
    localStorage.removeItem(GOOGLE_EMAIL_KEY);
    localStorage.removeItem(GOOGLE_OAUTH_STATUS_KEY);
    setGoogleConnected(false);
    setGoogleEmail('');
    setLastSyncedAt('');
    setSyncMeetings(false);
    setImportGoogleEvents(false);
    setSettingsMessage('Google Calendar disconnected.');
  };

  const updateTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const updateGoogleSync = (setting) => (next) => {
    if (setting === 'meetings') {
      setSyncMeetings(next);
      localStorage.setItem(GOOGLE_SYNC_KEY, String(next || syncDeadlines));
      return;
    }
    setSyncDeadlines(next);
    localStorage.setItem(GOOGLE_SYNC_KEY, String(syncMeetings || next));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto text-left animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">Manage application preferences, notifications, appearance, and integrations.</p>
      </div>

      {settingsMessage && (
        <div className="p-3.5 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/50 text-violet-600 dark:text-violet-350 text-xs rounded-xl font-semibold">
          {settingsMessage}
        </div>
      )}

      <SettingsSection title="Google Integrations" icon={Sparkles}>
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                <GoogleLabel>Google Calendar</GoogleLabel>
              </h3>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {googleConnected ? (googleEmail ? `Connected as ${googleEmail}` : 'Connected to Google Calendar') : 'Connect Google Calendar to sync events.'}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span className={`h-2 w-2 rounded-full ${googleConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {googleConnected ? <GoogleLabel>Connected</GoogleLabel> : <GoogleLabel kind="g">Not Connected</GoogleLabel>}
              </div>
              {lastSyncedAt && (
                <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">Last sync: {new Date(lastSyncedAt).toLocaleString()}</p>
              )}
            </div>
            {googleConnected ? (
              <button onClick={disconnectGoogle} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/35">
                <XCircle className="h-4 w-4" />
                Disconnect
              </button>
            ) : (
              <button onClick={connectGoogle} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-violet-700">
                <GoogleLabel kind="g" iconClassName="bg-white rounded-full">Connect Google Calendar</GoogleLabel>
              </button>
            )}
          </div>
        </div>
        <ToggleRow title="Sync TaskPilot meetings" description="Add TaskPilot meetings to Google Calendar." checked={syncMeetings} onChange={updateGoogleSync('meetings')} disabled={!googleConnected} />
        <ToggleRow title="Sync deadlines" description="Send task deadlines to Google Calendar." checked={syncDeadlines} onChange={updateGoogleSync('deadlines')} disabled={!googleConnected} />
        <ToggleRow title="Import Google Calendar events" description="Show Google Calendar events inside TaskPilot." checked={importGoogleEvents} onChange={setImportGoogleEvents} disabled={!googleConnected} />
      </SettingsSection>

      <SettingsSection title="Notifications" icon={Bell}>
        <ToggleRow title="Desktop Notifications" description="Allow browser notifications for important activity." checked={desktopNotifications} onChange={setDesktopNotifications} />
        <ToggleRow title="Meeting reminders" description="Notify before scheduled meetings." checked={meetingReminders} onChange={setMeetingReminders} />
        <ToggleRow title="Deadline reminders" description="Notify before approaching task deadlines." checked={deadlineReminders} onChange={setDeadlineReminders} />
        <ToggleRow title="Task assignment notifications" description="Notify when a task is assigned to you." checked={taskAssignmentNotifications} onChange={setTaskAssignmentNotifications} />
        <ToggleRow title="Email notifications" description="Send notification summaries to your email address." checked={emailNotifications} onChange={setEmailNotifications} />
      </SettingsSection>

      <SettingsSection title="Appearance" icon={Palette}>
        <SelectRow title="Theme" description="Choose the interface color mode." value={theme} onChange={updateTheme} options={[['dark', 'Dark'], ['light', 'Light']]} icon={Monitor} />
        <SelectRow title="Accent color" description="Pick the primary highlight color." value={accentColor} onChange={setAccentColor} options={[['violet', 'Violet'], ['blue', 'Blue'], ['emerald', 'Emerald'], ['amber', 'Amber'], ['rose', 'Rose']]} icon={Sparkles} />
        <ToggleRow title="Compact Mode" description="Use tighter spacing for dense workflows." checked={compactMode} onChange={setCompactMode} />
        <ToggleRow title="Reduce animations" description="Minimize motion in transitions and feedback." checked={reduceAnimations} onChange={setReduceAnimations} />
      </SettingsSection>

      <SettingsSection title="Calendar" icon={CalendarDays}>
        <SelectRow title="Default View" description="Choose the first calendar view to open." value={defaultView} onChange={setDefaultView} options={[['week', 'Week'], ['month', 'Month'], ['day', 'Day']]} icon={LayoutGrid} />
        <SelectRow title="First day of week" description="Choose how weekly calendars begin." value={firstDayOfWeek} onChange={setFirstDayOfWeek} options={[['monday', 'Monday'], ['sunday', 'Sunday']]} icon={CalendarDays} />
        <SelectRow title="Time format" description="Display times in 12-hour or 24-hour format." value={timeFormat} onChange={setTimeFormat} options={[['12-hour', '12-hour'], ['24-hour', '24-hour']]} icon={Clock} />
        <ToggleRow title="Show current time indicator" description="Display the current time marker on calendar views." checked={showCurrentTime} onChange={setShowCurrentTime} />
        <ToggleRow title="Auto scroll to current time" description="Open calendar views near the current time." checked={autoScrollCurrentTime} onChange={setAutoScrollCurrentTime} />
      </SettingsSection>
    </div>
  );
};

const SettingsSection = ({ title, icon: Icon, children }) => (
  <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-xs transition-colors duration-200">
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/25 dark:text-violet-400">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h2>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

const ToggleRow = ({ title, description, checked, onChange, disabled = false }) => (
  <label className={`flex items-center justify-between gap-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-4 py-3 ${disabled ? 'opacity-55' : 'cursor-pointer'}`}>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{title}</span>
      <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{description}</span>
    </span>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 shrink-0 accent-violet-600" />
  </label>
);

const SelectRow = ({ title, description, value, onChange, options, icon: Icon = SettingsIcon }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-4 py-3 md:flex-row md:items-center md:justify-between">
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{description}</span>
      </span>
    </div>
    <TaskPilotSelect value={value} onChange={onChange} options={options} className="md:w-56" />
  </div>
);

export default Settings;






