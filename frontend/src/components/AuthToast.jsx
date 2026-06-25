import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const toneMap = {
  success: {
    Icon: CheckCircle2,
    dot: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/25',
    iconText: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    Icon: AlertTriangle,
    dot: 'bg-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-950/25',
    iconText: 'text-rose-600 dark:text-rose-400',
  },
};

export const showAuthToast = ({ type = 'success', title, description }) => {
  const tone = toneMap[type] || toneMap.success;
  const Icon = tone.Icon;

  toast.custom((toastId) => (
    <div className="taskpilot-toast-card group w-[360px] max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-2xl shadow-slate-900/12 dark:shadow-black/35 backdrop-blur-xl text-left">
      <div className="flex gap-3 p-4 pb-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.iconBg} ${tone.iconText}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate">{title}</p>
              {description && <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>}
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(toastId)}
              className="opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`taskpilot-toast-progress h-full ${tone.dot}`} />
      </div>
    </div>
  ), { duration: 5000 });
};
