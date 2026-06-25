import { GoogleGIcon } from './GoogleBranding';

const GoogleAuthButton = ({ children, onClick, loading = false, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full h-[42px] rounded-lg bg-white dark:bg-white text-slate-900 dark:text-slate-900 border border-slate-200 text-sm font-semibold flex items-center justify-center gap-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
  >
    {loading ? (
      <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin" />
    ) : (
      <GoogleGIcon size="md" />
    )}
    <span className="text-slate-900 dark:text-slate-900 font-semibold">{loading ? 'Connecting...' : children}</span>
  </button>
);

export const AuthDivider = () => (
  <div className="my-5 flex items-center gap-3">
    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">OR</span>
    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
  </div>
);

export default GoogleAuthButton;
