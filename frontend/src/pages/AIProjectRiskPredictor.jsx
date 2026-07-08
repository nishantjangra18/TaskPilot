import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarClock,
  Check,
  Clock3,
  Gauge,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { TaskPilotSelect } from '../components/TaskPilotControls';
import { analyzeProjectRisk, formatDate, getId } from '../services/riskPredictionEngine';

const severityClass = severity => ({
  Low: 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/20',
  Medium: 'bg-amber-500/10 text-amber-200 ring-amber-400/20',
  High: 'bg-orange-500/10 text-orange-200 ring-orange-400/20',
  Critical: 'bg-rose-500/10 text-rose-200 ring-rose-400/20',
}[severity] || 'bg-slate-500/10 text-slate-200 ring-slate-400/20');

const riskTone = tone => ({
  healthy: 'from-emerald-400 to-teal-300 text-emerald-100 ring-emerald-300/25',
  medium: 'from-amber-300 to-orange-300 text-amber-100 ring-amber-300/25',
  high: 'from-rose-400 to-orange-400 text-rose-100 ring-rose-300/25',
}[tone] || 'from-violet-400 to-sky-300 text-violet-100 ring-violet-300/25');

const memberRiskClass = risk => ({
  Low: 'text-emerald-200 bg-emerald-500/10 ring-emerald-400/20',
  Medium: 'text-amber-200 bg-amber-500/10 ring-amber-400/20',
  High: 'text-orange-200 bg-orange-500/10 ring-orange-400/20',
  Critical: 'text-rose-200 bg-rose-500/10 ring-rose-400/20',
}[risk] || 'text-slate-200 bg-white/10 ring-white/10');

const AIProjectRiskPredictor = () => {
  const { projects = [], tasks = [], users = [], currentUser, editTask, editProject, refreshData, dataLoading } = useApp();
  const [selectedProjectId, setSelectedProjectId] = useState(() => getId(projects[0]) || '');
  const [previewId, setPreviewId] = useState('');
  const [dismissed, setDismissed] = useState([]);
  const [applyingId, setApplyingId] = useState('');

  const project = useMemo(() => projects.find(item => getId(item) === selectedProjectId) || projects[0] || null, [projects, selectedProjectId]);
  const analysis = useMemo(() => analyzeProjectRisk({ project, tasks, users, currentUser }), [project, tasks, users, currentUser]);
  const recommendations = (analysis?.recommendations || []).filter(item => !dismissed.includes(item.id));

  const applyRecommendation = async recommendation => {
    if (!recommendation?.action) return;
    if (recommendation.action.kind === 'planning') {
      toast.info(recommendation.preview || 'Use this recommendation during project planning.');
      setDismissed(prev => [...prev, recommendation.id]);
      return;
    }

    const ok = window.confirm(`Apply AI recommendation?\n\n${recommendation.title}\n${recommendation.preview}`);
    if (!ok) return;

    setApplyingId(recommendation.id);
    try {
      if (recommendation.action.kind === 'editTask') {
        await editTask(recommendation.action.taskId, recommendation.action.updates);
      } else if (recommendation.action.kind === 'editProject') {
        await editProject(recommendation.action.projectId, recommendation.action.updates);
      }
      setDismissed(prev => [...prev, recommendation.id]);
      toast.success('AI recommendation applied. Risk analysis is refreshing.');
    } catch (error) {
      toast.error(error.message || 'Unable to apply recommendation.');
    } finally {
      setApplyingId('');
    }
  };

  if (!projects.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950 p-10 text-center text-white">
        <Sparkles className="mx-auto h-9 w-9 text-violet-300" />
        <h1 className="mt-4 text-2xl font-black">AI Risk Predictor</h1>
        <p className="mt-2 text-sm font-semibold text-slate-400">Create a project with tasks and members to start predicting delivery risk.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left text-white">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 shadow-2xl shadow-slate-950/10 ring-1 ring-white/10 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.22),transparent_58%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200 ring-1 ring-white/10">
              <Bot className="h-3.5 w-3.5" /> AI Risk Predictor
            </div>
            <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">Predict project risk before it becomes project failure.</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-400 sm:text-base">
              Continuous project analysis across deadlines, workload, skills, dependencies, priorities, and completion velocity.
            </p>
          </div>
          <div className="w-full max-w-sm space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Project</span>
            <TaskPilotSelect
              portal
              value={getId(project)}
              onChange={value => { setSelectedProjectId(value); setDismissed([]); setPreviewId(''); }}
              options={projects.map(item => [getId(item), item.name])}
            />
          </div>
        </div>
      </section>

      {analysis && (
        <>
          <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="rounded-3xl bg-slate-950 p-6 ring-1 ring-white/10">
              <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${riskTone(analysis.tone)}`}>
                {analysis.status}
              </div>
              <div className="mt-6 flex items-end gap-3">
                <span className="text-7xl font-black leading-none text-white">{analysis.score}</span>
                <span className="pb-2 text-xl font-black text-slate-500">%</span>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-400">Overall AI risk score based on active tasks, overdue work, staffing, skill fit, dependencies, and predicted delivery date.</p>
              <div className="mt-6 h-3 rounded-full bg-white/[0.08]">
                <div className={`h-3 rounded-full bg-gradient-to-r ${analysis.tone === 'healthy' ? 'from-emerald-400 to-teal-300' : analysis.tone === 'medium' ? 'from-amber-300 to-orange-300' : 'from-rose-400 to-orange-400'}`} style={{ width: `${analysis.score}%` }} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <HealthCard icon={CalendarClock} label="Planned" value={formatDate(analysis.timeline.plannedDate)} detail="Current planned completion" />
              <HealthCard icon={Clock3} label="Predicted" value={formatDate(analysis.timeline.predictedDate)} detail={analysis.timeline.delayDays ? `${analysis.timeline.delayDays} day delay predicted` : 'No delay predicted'} />
              <HealthCard icon={Gauge} label="Confidence" value={`${analysis.timeline.confidence}%`} detail={`${analysis.timeline.dailyVelocity}h/day velocity`} />
              <HealthCard icon={ShieldAlert} label="Open Risks" value={analysis.risks.length} detail={`${analysis.stats.overdueTasks} overdue tasks`} />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-5">
              <Panel title="Detected Risks" icon={AlertTriangle} right={`${analysis.risks.length} findings`}>
                <div className="grid gap-3 lg:grid-cols-2">
                  {analysis.risks.length ? analysis.risks.map(risk => <RiskCard key={risk.id} risk={risk} />) : <EmptyState title="No active project risks" text="The current plan looks healthy based on available project data." />}
                </div>
              </Panel>

              <Panel title="Team Health" icon={Users} right={`${analysis.teamHealth.length} members`}>
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {analysis.teamHealth.map(member => <TeamHealthCard key={member.id} stat={member} />)}
                </div>
              </Panel>
            </div>

            <Panel title="AI Recommendations" icon={Lightbulb} right={dataLoading ? 'Refreshing' : `${recommendations.length} open`}>
              <div className="space-y-3">
                <button type="button" onClick={refreshData} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2 text-xs font-black text-slate-200 ring-1 ring-white/10 transition hover:bg-white/[0.1]">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh Analysis
                </button>
                {recommendations.length ? recommendations.map(recommendation => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    previewOpen={previewId === recommendation.id}
                    applying={applyingId === recommendation.id}
                    onPreview={() => setPreviewId(previewId === recommendation.id ? '' : recommendation.id)}
                    onApply={() => applyRecommendation(recommendation)}
                    onDismiss={() => setDismissed(prev => [...prev, recommendation.id])}
                  />
                )) : <EmptyState title="No quick actions needed" text="Dismissed or resolved recommendations will stay out of the way for this session." />}
              </div>
            </Panel>
          </section>
        </>
      )}
    </div>
  );
};

const HealthCard = ({ icon: Icon, label, value, detail }) => (
  <article className="rounded-3xl bg-slate-950 p-5 ring-1 ring-white/10">
    <Icon className="h-5 w-5 text-violet-300" />
    <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 truncate text-lg font-black text-white">{value}</p>
    <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
  </article>
);

const Panel = ({ title, icon: Icon, right, children }) => (
  <section className="rounded-3xl bg-slate-950 p-5 ring-1 ring-white/10">
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-violet-300" />
        <h2 className="text-sm font-black text-white">{title}</h2>
      </div>
      {right && <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 ring-1 ring-white/10">{right}</span>}
    </div>
    {children}
  </section>
);

const RiskCard = ({ risk }) => (
  <article className="rounded-2xl bg-white/[0.055] p-4 ring-1 ring-white/10">
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-sm font-black text-white">{risk.title}</h3>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ring-1 ${severityClass(risk.severity)}`}>{risk.severity}</span>
    </div>
    <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">{risk.description}</p>
    {risk.evidence && <p className="mt-3 rounded-xl bg-slate-950/60 px-3 py-2 text-[11px] font-semibold text-slate-500">{risk.evidence}</p>}
  </article>
);

const TeamHealthCard = ({ stat }) => (
  <article className="rounded-2xl bg-white/[0.055] p-4 ring-1 ring-white/10">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={stat.member?.name || stat.member?.email || 'Member'} avatar={stat.member?.avatar} className="h-10 w-10 text-[11px]" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-white">{stat.member?.name || stat.member?.email || 'Member'}</h3>
          <p className="truncate text-xs font-semibold text-slate-500">{stat.member?.title || stat.member?.role || 'Project Member'}</p>
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ring-1 ${memberRiskClass(stat.riskLevel)}`}>{stat.riskLevel}</span>
    </div>
    <div className="mt-4 h-2 rounded-full bg-white/[0.08]">
      <div className={`h-2 rounded-full ${stat.riskLevel === 'Critical' ? 'bg-rose-400' : stat.riskLevel === 'High' ? 'bg-orange-400' : stat.riskLevel === 'Medium' ? 'bg-amber-300' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, stat.workload)}%` }} />
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
      <MiniStat label="Workload" value={`${stat.workload}%`} />
      <MiniStat label="Capacity" value={`${stat.availableCapacity}h`} />
      <MiniStat label="Skill" value={`${stat.skillMatch}%`} />
    </div>
  </article>
);

const MiniStat = ({ label, value }) => <div className="rounded-xl bg-slate-950/70 px-2 py-2"><p className="text-xs font-black text-white">{value}</p><p className="mt-0.5 text-[9px] font-black uppercase text-slate-500">{label}</p></div>;

const RecommendationCard = ({ recommendation, previewOpen, applying, onPreview, onApply, onDismiss }) => (
  <article className="rounded-2xl bg-white/[0.055] p-4 ring-1 ring-white/10">
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ring-1 ${severityClass(recommendation.severity)}`}>{recommendation.severity}</span>
        <h3 className="mt-3 text-sm font-black text-white">{recommendation.title}</h3>
      </div>
      <button type="button" onClick={onDismiss} className="rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"><X className="h-4 w-4" /></button>
    </div>
    <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">{recommendation.description}</p>
    <div className="mt-4 grid grid-cols-3 gap-2">
      <button type="button" onClick={onPreview} className="rounded-xl bg-white/[0.07] px-2 py-2 text-xs font-black text-slate-200 ring-1 ring-white/10 hover:bg-white/[0.1]">Preview</button>
      <button type="button" disabled={applying} onClick={onApply} className="inline-flex items-center justify-center gap-1 rounded-xl bg-violet-600 px-2 py-2 text-xs font-black text-white shadow-lg shadow-violet-950/30 disabled:opacity-60">{applying ? 'Applying' : 'Apply'}<Check className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={onDismiss} className="rounded-xl bg-white/[0.04] px-2 py-2 text-xs font-black text-slate-400 ring-1 ring-white/10 hover:bg-white/[0.08]">Dismiss</button>
    </div>
    {previewOpen && (
      <div className="mt-4 rounded-2xl bg-slate-950/70 p-3 ring-1 ring-white/10">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Preview</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">{recommendation.preview}</p>
        {recommendation.action?.kind !== 'planning' && <p className="mt-2 inline-flex items-center gap-2 text-[11px] font-bold text-violet-200"><ArrowRight className="h-3.5 w-3.5" /> Uses existing {recommendation.action.kind === 'editTask' ? 'task' : 'project'} update API.</p>}
      </div>
    )}
  </article>
);

const EmptyState = ({ title, text }) => (
  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
    <ShieldAlert className="mx-auto h-6 w-6 text-violet-300" />
    <p className="mt-3 text-sm font-black text-white">{title}</p>
    <p className="mt-1 text-xs font-semibold text-slate-500">{text}</p>
  </div>
);

export default AIProjectRiskPredictor;
