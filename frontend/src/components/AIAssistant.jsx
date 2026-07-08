import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowDown, CalendarClock, CalendarDays, Check, CheckCircle2, ClipboardList, Copy, Eye, Layers3, Loader2, MessageCircle, PencilLine, Send, ShieldCheck, TimerReset, Trash2, UserCheck, UserRound, X } from 'lucide-react';
import { AI_REQUEST_STATUS, applyAIAction, sendAIChatMessage, streamAIChatMessage } from '../services/aiService';
import TaskPilotLogoIcon from './TaskPilotLogoIcon';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi, I am TaskPilot AI. Ask me about software project planning, sprints, estimates, deadlines, roles, or productivity.',
};

const PLANNING_PROMPT_PATTERN = /\b(create\s+(?:a\s+)?task\s+plan|break\s+(?:this|it|the)?\s*feature\s+into\s+tasks|plan\s+(?:this\s+)?project|generate\s+(?:a\s+)?sprint|generate\s+milestones?|estimate\s+workload|execution\s+plan|task\s+breakdown|sprint\s+plan|milestone\s+plan)\b/i;
const ACTION_PROMPT_PATTERN = /\b(reassign|assign\s+.*to|change\s+priority|update\s+due\s+date|move\s+.*status|mark\s+.*complete|complete\s+.*task|what\s+actions|suggest\s+actions|actionable|apply|fix\s+workload|reduce\s+risk|balance\s+workload|who\s+should|prioriti[sz]e\s+next)\b/i;
const isPlanningPrompt = (message) => PLANNING_PROMPT_PATTERN.test(message || '');
const isActionPrompt = (message) => ACTION_PROMPT_PATTERN.test(message || '');

const createMessage = (role, content) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
});

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const keywordSets = {
  js: ['const', 'let', 'var', 'return', 'if', 'else', 'async', 'await', 'function', 'import', 'from', 'export', 'try', 'catch', 'throw', 'new'],
  jsx: ['const', 'let', 'return', 'if', 'else', 'async', 'await', 'function', 'import', 'from', 'export', 'className'],
  ts: ['const', 'let', 'type', 'interface', 'return', 'if', 'else', 'async', 'await', 'function', 'import', 'from', 'export'],
  json: ['true', 'false', 'null'],
};

const languageAliases = {
  javascript: 'js',
  typescript: 'ts',
  react: 'jsx',
};

const highlightCode = (code, language = '') => {
  const normalizedLanguage = languageAliases[language.toLowerCase()] || language.toLowerCase();
  const keywords = keywordSets[normalizedLanguage] || keywordSets.js;
  const pattern = new RegExp(`(\\b(?:${keywords.map(escapeRegExp).join('|')})\\b|"[^"\\n]*"|'[^'\\n]*'|//.*$|#[^\\n]*$|\\b\\d+(?:\\.\\d+)?\\b)`, 'gm');
  const parts = code.split(pattern).filter(Boolean);

  return parts.map((part, index) => {
    let className = 'text-slate-200';
    if (keywords.includes(part)) className = 'text-violet-300';
    else if (/^['"]/.test(part)) className = 'text-emerald-300';
    else if (/^(\/\/|#)/.test(part)) className = 'text-slate-500';
    else if (/^\d/.test(part)) className = 'text-amber-300';
    return <span key={`${part}-${index}`} className={className}>{part}</span>;
  });
};

const parseMarkdownBlocks = (content) => {
  const blocks = [];
  const lines = content.split('\n');
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const fence = line.match(/^```(\w+)?\s*$/);

    if (fence) {
      const language = fence[1] || 'text';
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: 'code', language, content: codeLines.join('\n') });
      index += 1;
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim() && !lines[index].startsWith('```')) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: 'text', content: paragraphLines.join('\n') });
  }

  return blocks;
};

const renderInline = (text) => {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))/g).filter(Boolean);

  return segments.map((segment, index) => {
    if (segment.startsWith('`') && segment.endsWith('`')) {
      return <code key={index} className="rounded-md border border-slate-200/70 bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-violet-700 dark:border-slate-700 dark:bg-slate-950 dark:text-violet-200">{segment.slice(1, -1)}</code>;
    }
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={index} className="font-extrabold text-slate-900 dark:text-white">{segment.slice(2, -2)}</strong>;
    }
    const linkMatch = segment.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (linkMatch) {
      return <a key={index} href={linkMatch[2]} target="_blank" rel="noreferrer" className="font-bold text-violet-600 underline decoration-violet-300 underline-offset-2 dark:text-violet-300">{linkMatch[1]}</a>;
    }
    return <span key={index}>{segment}</span>;
  });
};

const TextBlock = ({ content }) => {
  const lines = content.split('\n');
  const allBullets = lines.every(line => /^[-*]\s+/.test(line.trim()));
  const allNumbered = lines.every(line => /^\d+\.\s+/.test(line.trim()));

  if (/^#{1,3}\s+/.test(content.trim()) && lines.length === 1) {
    const level = content.match(/^#+/)?.[0].length || 2;
    const text = content.replace(/^#{1,3}\s+/, '');
    const className = level === 1 ? 'text-sm font-black' : 'text-xs font-black';
    return <h3 className={`${className} mt-1 text-slate-950 dark:text-white`}>{renderInline(text)}</h3>;
  }

  if (allBullets) {
    return <ul className="space-y-1 pl-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{lines.map((line, index) => <li key={index} className="list-disc marker:text-violet-500">{renderInline(line.replace(/^[-*]\s+/, ''))}</li>)}</ul>;
  }

  if (allNumbered) {
    return <ol className="space-y-1 pl-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{lines.map((line, index) => <li key={index} className="list-decimal marker:text-violet-500 marker:font-black">{renderInline(line.replace(/^\d+\.\s+/, ''))}</li>)}</ol>;
  }

  if (lines.every(line => line.trim().startsWith('>'))) {
    return <blockquote className="border-l-2 border-violet-500/70 pl-3 text-xs font-semibold italic leading-relaxed text-slate-500 dark:text-slate-400">{renderInline(lines.map(line => line.replace(/^>\s?/, '')).join(' '))}</blockquote>;
  }

  return <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-300">{renderInline(content)}</p>;
};

const MarkdownMessage = ({ content, onCopyCode, copiedCodeId }) => {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          const codeId = `${index}-${block.language}-${block.content.length}`;
          return (
            <div key={codeId} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{block.language || 'code'}</span>
                <button type="button" onClick={() => onCopyCode(block.content, codeId)} className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[10px] font-bold text-slate-400 hover:bg-white/10 hover:text-white">
                  {copiedCodeId === codeId ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCodeId === codeId ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="max-h-80 overflow-auto p-3 text-left text-xs leading-relaxed [scrollbar-width:thin] [scrollbar-color:#7c3aed_#0f172a]"><code>{highlightCode(block.content, block.language)}</code></pre>
            </div>
          );
        }
        return <TextBlock key={`${block.type}-${index}`} content={block.content} />;
      })}
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-1 py-1">
    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 taskpilot-ai-typing-dot" />
    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 taskpilot-ai-typing-dot [animation-delay:120ms]" />
    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 taskpilot-ai-typing-dot [animation-delay:240ms]" />
  </div>
);

const getPriorityClass = (priority) => {
  const classes = {
    critical: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    high: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    medium: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  };
  return classes[String(priority || 'medium').toLowerCase()] || classes.medium;
};

const PlanPreview = ({ plan, onCancel }) => {
  const [notice, setNotice] = useState('');
  const milestones = Array.isArray(plan?.milestones) ? plan.milestones : [];
  const tasks = milestones.flatMap(milestone => Array.isArray(milestone.tasks) ? milestone.tasks : []);
  const totalHours = tasks.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0);
  const assignees = [...new Set(tasks.map(task => task.suggestedAssignee || 'Unassigned'))];

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  };

  if (!plan) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-violet-500/20 bg-slate-950/95 text-slate-100 shadow-xl shadow-violet-950/20">
      <div className="border-b border-white/10 bg-violet-500/10 px-3.5 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
            <ClipboardList className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-violet-300">Project Summary</p>
            <h3 className="mt-0.5 text-sm font-black text-white">{plan.title || 'Execution Plan'}</h3>
            {plan.summary && <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-300">{plan.summary}</p>}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
            <Layers3 className="mb-1 h-3.5 w-3.5 text-violet-300" />
            <p className="text-[10px] font-bold text-slate-400">Milestones</p>
            <p className="text-sm font-black text-white">{milestones.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
            <ClipboardList className="mb-1 h-3.5 w-3.5 text-violet-300" />
            <p className="text-[10px] font-bold text-slate-400">Tasks</p>
            <p className="text-sm font-black text-white">{tasks.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
            <TimerReset className="mb-1 h-3.5 w-3.5 text-violet-300" />
            <p className="text-[10px] font-bold text-slate-400">Hours</p>
            <p className="text-sm font-black text-white">{totalHours}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-3.5 py-3.5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <UserRound className="h-3.5 w-3.5 text-violet-300" /> Suggested Assignees
          </div>
          <div className="flex flex-wrap gap-1.5">
            {assignees.map(assignee => <span key={assignee} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300">{assignee}</span>)}
          </div>
        </div>

        {milestones.map((milestone, milestoneIndex) => (
          <section key={`${milestone.title}-${milestoneIndex}`} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-white">
              <CalendarClock className="h-4 w-4 text-violet-300" />
              <span>{milestone.title || `Milestone ${milestoneIndex + 1}`}</span>
            </div>
            <div className="space-y-2">
              {(milestone.tasks || []).map((task, taskIndex) => (
                <article key={`${task.title}-${taskIndex}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="text-xs font-black leading-snug text-white">{task.title}</h4>
                    <span className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-black uppercase ${getPriorityClass(task.priority)}`}>{task.priority || 'medium'}</span>
                  </div>
                  {task.description && <p className="text-[11px] font-semibold leading-relaxed text-slate-300">{task.description}</p>}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-900/80 px-2.5 py-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Suggested Assignee</p>
                      <p className="truncate text-[11px] font-bold text-slate-200">{task.suggestedAssignee || 'Unassigned'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-900/80 px-2.5 py-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Estimated Hours</p>
                      <p className="text-[11px] font-bold text-slate-200">{Number(task.estimatedHours) || 0}h</p>
                    </div>
                  </div>
                  {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
                    <div className="mt-2 rounded-xl bg-slate-900/80 px-2.5 py-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Dependencies</p>
                      <p className="text-[11px] font-semibold text-slate-300">{task.dependencies.join(', ')}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="border-t border-white/10 bg-white/[0.03] px-3.5 py-3">
        {notice && <p className="mb-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200">{notice}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => showNotice('Coming in next phase.')} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-violet-500">Create Tasks</button>
          <button type="button" onClick={() => showNotice('Plan editing is coming in next phase.')} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 transition-colors hover:bg-white/10 hover:text-white"><PencilLine className="h-3.5 w-3.5" />Edit Plan</button>
          <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-400 transition-colors hover:bg-white/10 hover:text-white">Cancel</button>
        </div>
      </div>
    </div>
  );
};

const getRiskClass = (riskLevel) => {
  const classes = {
    High: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    Low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  };
  return classes[riskLevel] || classes.Low;
};

const actionMeta = {
  reassign_task: { icon: UserCheck, title: 'Reassign task' },
  update_due_date: { icon: CalendarDays, title: 'Update due date' },
  change_priority: { icon: AlertTriangle, title: 'Change priority' },
  mark_complete: { icon: CheckCircle2, title: 'Mark complete' },
};

const fieldLabels = {
  assignee: 'Assignee',
  dueDate: 'Due Date',
  priority: 'Priority',
  status: 'Status',
};

const formatPreviewValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not set';
  return String(value).replace(/_/g, ' ');
};

const ActionCard = ({ action, onDismiss }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applyState, setApplyState] = useState('idle');
  const [applyMessage, setApplyMessage] = useState('');
  const meta = actionMeta[action.type] || { icon: ShieldCheck, title: 'AI action' };
  const Icon = meta.icon;
  const preview = action.preview || {};
  const fields = Array.isArray(preview.fields) ? preview.fields : [];
  const title = preview.current?.taskTitle || 'Selected task';
  const isApplying = applyState === 'loading';
  const isApplied = applyState === 'success';

  const confirmApply = async () => {
    if (isApplying || isApplied) return;
    setApplyState('loading');
    setApplyMessage('');

    const result = await applyAIAction(action);
    if (result.success) {
      setApplyState('success');
      setApplyMessage(result.message || 'Action applied successfully.');
      setConfirmOpen(false);
      return;
    }

    setApplyState('error');
    setApplyMessage(result.message || 'Could not apply this action.');
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/95 p-3 text-slate-100 shadow-lg shadow-violet-950/10">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-black leading-snug text-white">{action.label || meta.title}</h4>
            <span className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-black uppercase ${getRiskClass(action.riskLevel)}`}>{action.riskLevel || 'Low'}</span>
          </div>
          {action.reason && <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-slate-300">{action.reason}</p>}
        </div>
      </div>

      {previewOpen && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-violet-300">Preview Changes</p>
          <h5 className="mt-1 text-xs font-black text-white">{title}</h5>
          <div className="mt-3 space-y-2.5">
            {fields.map(field => (
              <div key={field} className="rounded-xl bg-slate-900/80 p-2.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{fieldLabels[field] || field}</p>
                <div className="mt-1 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div>
                    <p className="text-[9px] font-bold text-slate-500">Current</p>
                    <p className="text-[11px] font-bold capitalize text-slate-300">{formatPreviewValue(preview.current?.[field])}</p>
                  </div>
                  <ArrowDown className="hidden h-3.5 w-3.5 rotate-[-90deg] text-violet-300 sm:block" />
                  <div>
                    <p className="text-[9px] font-bold text-slate-500">New</p>
                    <p className="text-[11px] font-bold capitalize text-violet-200">{formatPreviewValue(preview.next?.[field])}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {action.reason && (
            <div className="mt-2 rounded-xl bg-slate-900/80 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Reason</p>
              <p className="text-[11px] font-semibold text-slate-300">{action.reason}</p>
            </div>
          )}
        </div>
      )}

      {confirmOpen && (
        <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">
          <p className="text-xs font-black text-white">Confirm AI action</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-300">This will update:</p>
          <ul className="mt-2 space-y-1 pl-4 text-[11px] font-semibold text-slate-300">
            {fields.map(field => <li key={field} className="list-disc marker:text-violet-300">{title} {fieldLabels[field]?.toLowerCase() || field} will change</li>)}
            <li className="list-disc marker:text-violet-300">Notification will be sent when applicable</li>
            <li className="list-disc marker:text-violet-300">Activity log will be updated</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setConfirmOpen(false)} disabled={isApplying} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={confirmApply} disabled={isApplying || isApplied} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
              {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {applyMessage && (
        <p className={`mt-3 rounded-xl border px-3 py-2 text-[11px] font-bold ${isApplied ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'}`}>{applyMessage}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setPreviewOpen(value => !value)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
          <Eye className="h-3.5 w-3.5" />{previewOpen ? 'Hide Preview' : 'Preview'}
        </button>
        <button type="button" onClick={() => setConfirmOpen(true)} disabled={isApplied} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Apply</button>
        <button type="button" onClick={onDismiss} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-400 transition-colors hover:bg-white/10 hover:text-white">Dismiss</button>
      </div>
    </article>
  );
};

const ActionSuggestions = ({ actions, onDismiss }) => {
  if (!Array.isArray(actions) || actions.length === 0) return null;

  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-300">
        <ShieldCheck className="h-3.5 w-3.5" /> Action Suggestions
      </div>
      {actions.map((action, index) => (
        <ActionCard key={`${action.type}-${action.taskId}-${index}`} action={action} onDismiss={() => onDismiss(index)} />
      ))}
    </div>
  );
};
const getProjectIdFromPath = (pathname) => {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] && match[1] !== 'new' ? match[1] : null;
};

const AIAssistant = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(AI_REQUEST_STATUS.IDLE);
  const [error, setError] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const currentProjectId = useMemo(() => getProjectIdFromPath(location.pathname), [location.pathname]);
  const isProcessing = status === AI_REQUEST_STATUS.LOADING;
  const hasConversation = messages.some(message => message.id !== 'welcome');

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open, status]);

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    window.setTimeout(() => textareaRef.current?.focus(), 180);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 132)}px`;
  }, [input]);

  const copyCode = async (code, codeId) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(codeId);
      window.setTimeout(() => setCopiedCodeId(''), 1600);
    } catch (err) {
      setError('Could not copy code to clipboard.');
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setError('');
    setInput('');
  };

  const buildConversationHistory = (nextMessages) => nextMessages
    .filter(message => message.id !== 'welcome')
    .map(message => ({ role: message.role, content: message.content }));

  const dismissAction = (messageId, actionIndex) => {
    setMessages(current => current.map(message => {
      if (message.id !== messageId) return message;
      return {
        ...message,
        actions: (message.actions || []).filter((_, index) => index !== actionIndex),
      };
    }));
  };


  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    const userMessage = createMessage('user', trimmed);
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage = { id: assistantId, role: 'assistant', content: '' };
    const nextMessages = [...messages, userMessage, assistantMessage];

    setMessages(nextMessages);
    setInput('');
    setError('');

    const conversationHistory = buildConversationHistory([...messages, userMessage]);

    if (isPlanningPrompt(trimmed) || isActionPrompt(trimmed)) {
      const structuredResult = await sendAIChatMessage({
        message: trimmed,
        projectId: currentProjectId,
        conversationHistory,
        onStatusChange: setStatus,
      });

      if (structuredResult.success && structuredResult.response) {
        setMessages(current => current.map(message => message.id === assistantId ? {
          ...message,
          content: structuredResult.response,
          plan: structuredResult.plan || null,
          actions: Array.isArray(structuredResult.actions) ? structuredResult.actions : [],
        } : message));
        setStatus(AI_REQUEST_STATUS.SUCCESS);
        return;
      }

      setMessages(current => current.filter(message => message.id !== assistantId));
      setError(structuredResult.message || 'TaskPilot AI could not create a preview.');
      return;
    }

    const streamResult = await streamAIChatMessage({
      message: trimmed,
      projectId: currentProjectId,
      conversationHistory,
      onStatusChange: setStatus,
      onChunk: (chunk) => {
        setMessages(current => current.map(message => message.id === assistantId ? { ...message, content: `${message.content}${chunk}` } : message));
      },
    });

    if (!streamResult.success || !streamResult.response?.trim()) {
      const fallbackResult = !streamResult.success
        ? await sendAIChatMessage({ message: trimmed, projectId: currentProjectId, conversationHistory, onStatusChange: setStatus })
        : streamResult;

      if (fallbackResult.success && fallbackResult.response) {
        setMessages(current => current.map(message => message.id === assistantId ? { ...message, content: fallbackResult.response, plan: fallbackResult.plan || null, actions: Array.isArray(fallbackResult.actions) ? fallbackResult.actions : [] } : message));
        setStatus(AI_REQUEST_STATUS.SUCCESS);
        return;
      }

      setMessages(current => current.filter(message => message.id !== assistantId));
      setError(fallbackResult.message || streamResult.message || 'TaskPilot AI could not respond.');
    }
  };
  const handleTextareaKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-[10030] flex h-14 w-14 items-center justify-center outline-hidden transition-all duration-300 hover:-translate-y-1 focus:ring-4 focus:ring-violet-500/20 ${open ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100 taskpilot-ai-float'} `}
        aria-label="Open TaskPilot AI"
        title="TaskPilot AI"
      >
        <TaskPilotLogoIcon className="h-10 w-10" alt="TaskPilot AI" />
      </button>

      {open && <div className="fixed inset-0 z-[10035] bg-slate-950/20 backdrop-blur-[2px] md:bg-transparent" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 right-0 z-[10040] flex w-full max-w-[420px] transform flex-col border-l border-white/10 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl transition-transform duration-300 ease-out dark:bg-slate-950/90 sm:right-3 sm:top-3 sm:bottom-3 sm:h-[calc(100vh-1.5rem)] sm:rounded-3xl sm:border ${open ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`} aria-hidden={!open}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
          <div className="flex min-w-0 items-center gap-3">
            <TaskPilotLogoIcon className="h-9 w-9" alt="TaskPilot AI" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black text-slate-950 dark:text-white">TaskPilot AI</h2>
              <p className="truncate text-[11px] font-bold text-slate-400 dark:text-slate-500">Senior project manager assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={clearChat} disabled={!hasConversation || isProcessing} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-900" title="Clear chat">
              <Trash2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:thin] [scrollbar-color:#7c3aed_transparent]">
          <div className="space-y-4">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const isEmptyAssistant = !isUser && !message.content && isProcessing;
              return (
                <div key={message.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && <TaskPilotLogoIcon className="mt-1 h-6 w-6" alt="TaskPilot AI" />}
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-3 text-left shadow-sm ${isUser ? 'rounded-br-md bg-violet-600 text-white shadow-violet-950/20' : 'rounded-bl-md border border-slate-100 bg-slate-50/90 text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200'}`}>
                    {isEmptyAssistant ? <TypingIndicator /> : isUser ? <p className="whitespace-pre-wrap text-xs font-semibold leading-relaxed text-white">{message.content}</p> : <>
                      <MarkdownMessage content={message.content} onCopyCode={copyCode} copiedCodeId={copiedCodeId} />
                      {message.plan && <PlanPreview plan={message.plan} onCancel={() => setMessages(current => current.map(item => item.id === message.id ? { ...item, plan: null } : item))} />}
                      <ActionSuggestions actions={message.actions} onDismiss={(actionIndex) => dismissAction(message.id, actionIndex)} />
                    </>}
                  </div>
                </div>
              );
            })}
            {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-xs font-bold text-rose-500 dark:text-rose-300">{error}</div>}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white/80 p-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner dark:border-slate-800 dark:bg-slate-900/80">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              disabled={isProcessing}
              rows={1}
              placeholder="Ask about sprint planning, estimates, blockers..."
              className="max-h-32 min-h-11 w-full resize-none bg-transparent px-2 py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white"
            />
            <div className="flex items-center justify-between gap-3 px-1 pb-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Enter to send</span>
              </div>
              <button type="button" onClick={sendMessage} disabled={!input.trim() || isProcessing} className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-violet-600 px-3 text-xs font-black text-white shadow-lg shadow-violet-950/20 transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500" title="Send message">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AIAssistant;
