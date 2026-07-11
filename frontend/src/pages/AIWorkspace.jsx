import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart3,
  Bot,
  CalendarClock,
  FileText,
  Gauge,
  GitBranch,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  Wand2,
} from 'lucide-react';

const aiCategories = [
  {
    name: 'Project Intelligence',
    tools: [
      {
        title: 'AI Project Creator',
        description: 'Turn a project idea into structured tasks, members, and timelines.',
        icon: Wand2,
        route: '/ai-project-creator',
        status: 'Available',
      },
      {
        title: 'Sprint Planner',
        description: 'Shape upcoming work into focused sprints with AI guidance.',
        icon: GitBranch,
        status: 'Coming Soon',
      },
      {
        title: 'AI Risk Predictor',
        description: 'Predict deadline, workload, skill, and dependency risks early.',
        icon: ShieldAlert,
        route: '/ai-risk-predictor',
        status: 'Available',
      },
    ],
  },
  {
    name: 'Team Intelligence',
    tools: [
      {
        title: 'AI Workload Balancer',
        description: 'Review workload pressure and rebalance tasks intelligently.',
        icon: Gauge,
        route: '/ai-workload-balancer',
        status: 'Available',
      },
      {
        title: 'Skill Matcher',
        description: 'Match the right teammate to each task using skill context.',
        icon: Target,
        status: 'Coming Soon',
      },
      {
        title: 'Team Analytics',
        description: 'Understand team momentum through AI-assisted signals.',
        icon: BarChart3,
        status: 'Coming Soon',
      },
    ],
  },
  {
    name: 'Productivity',
    tools: [
      {
        title: 'Meeting Assistant',
        description: 'Summarize meetings and extract decisions into next actions.',
        icon: CalendarClock,
        status: 'Coming Soon',
      },
      {
        title: 'Daily Standup',
        description: 'Generate concise standup updates from current project work.',
        icon: Users,
        status: 'Coming Soon',
      },
      {
        title: 'Reports',
        description: 'Create clean progress reports from live workspace context.',
        icon: FileText,
        status: 'Coming Soon',
      },
    ],
  },
];

const normalize = value => value.toLowerCase();

const AIWorkspace = () => {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalize(query.trim());

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return aiCategories;

    return aiCategories
      .map(category => ({
        ...category,
        tools: category.tools.filter(tool => {
          const searchable = `${category.name} ${tool.title} ${tool.description} ${tool.status}`;
          return normalize(searchable).includes(normalizedQuery);
        }),
      }))
      .filter(category => category.tools.length > 0);
  }, [normalizedQuery]);

  return (
    <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-2xl shadow-slate-950/10 sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.20),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="mx-auto flex max-w-3xl flex-col items-center py-8 text-center sm:py-12 lg:py-14">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.08] text-violet-200 ring-1 ring-white/10">
            <Bot className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-normal text-white sm:text-5xl lg:text-6xl">AI Workspace</h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-300 sm:text-lg">
            Choose an AI assistant to help you manage projects smarter.
          </p>

          <div className="relative mt-8 w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search AI assistants..."
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.07] pl-14 pr-5 text-sm font-semibold text-white outline-hidden shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition placeholder:text-slate-500 focus:border-violet-300/50 focus:bg-white/[0.09] focus:ring-4 focus:ring-violet-500/10"
            />
          </div>
        </section>

        <div className="space-y-12 pb-6">
          {filteredCategories.map(category => (
            <section key={category.name} className="space-y-5">
              <h2 className="text-xl font-black text-white sm:text-2xl">{category.name}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {category.tools.map(tool => (
                  <AIToolCard key={tool.title} tool={tool} />
                ))}
              </div>
            </section>
          ))}

          {filteredCategories.length === 0 && (
            <section className="rounded-3xl bg-white/[0.06] px-6 py-16 text-center ring-1 ring-white/10">
              <Sparkles className="mx-auto h-7 w-7 text-violet-200" />
              <h2 className="mt-4 text-lg font-black text-white">No AI assistants found</h2>
              <p className="mt-2 text-sm font-semibold text-slate-400">Try searching by feature, category, or status.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const AIToolCard = ({ tool }) => {
  const Icon = tool.icon;
  const isAvailable = tool.status === 'Available' && tool.route;

  const cardClass = `group flex min-h-[190px] w-full flex-col rounded-3xl bg-white/[0.065] p-6 text-left ring-1 ring-white/10 backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:bg-white/[0.085] hover:shadow-2xl hover:shadow-violet-500/15 hover:ring-violet-300/30 ${
    isAvailable ? 'cursor-pointer' : 'cursor-pointer opacity-60 hover:opacity-85'
  }`;

  const card = (
    <article className={cardClass}>
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/70 text-violet-200 ring-1 ring-white/10 transition group-hover:bg-violet-500/15 group-hover:text-violet-100">
          <Icon className="h-6 w-6" />
        </span>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${
          isAvailable
            ? 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/20'
            : 'bg-white/[0.07] text-slate-300 ring-white/10'
        }`}>
          {tool.status}
        </span>
      </div>

      <div className="mt-auto pt-8">
        <h3 className="text-lg font-black text-white">{tool.title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{tool.description}</p>
      </div>
    </article>
  );

  if (isAvailable) {
    return (
      <Link to={tool.route} className="block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/30">
        {card}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toast.info('This AI feature will be available in a future update.')}
      className="block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/30"
    >
      {card}
    </button>
  );
};

export default AIWorkspace;
