import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  FolderKanban, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  LayoutDashboard,
  TrendingUp,
  Users,
  Folder,
  Bell,
  MessageSquare,
  FileText,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeProvider';

const Landing = () => {
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState('');

  React.useEffect(() => {
    const handleScroll = () => {
      // Navbar scroll effect
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Scroll spy for active section detection
      const sections = ['features', 'about'];
      let currentActive = '';
      const spyThreshold = window.innerHeight * 0.3;
      
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= spyThreshold && rect.bottom >= spyThreshold) {
            currentActive = sectionId;
            break;
          }
        }
      }
      setActiveSection(currentActive);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll-triggered reveal animations
  React.useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.08,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach((el) => observer.observe(el));

    return () => {
      animatedElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${targetId}`);
      setActiveSection(targetId);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 scroll-smooth">
      
      {/* Component-scoped CSS keyframe animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.4deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-13px) rotate(-0.5deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(0.6deg); }
        }
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes draw-dash {
          to {
            stroke-dashoffset: -22;
          }
        }
        .animate-float-slow {
          animation: float-slow 7.5s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 5.5s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 4.2s ease-in-out infinite;
        }
        .animate-fade-up {
          opacity: 0;
          animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-in {
          opacity: 0;
          animation: scale-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .connecting-line {
          stroke-dasharray: 6 5;
          animation: draw-dash 3s linear infinite;
        }
        .scroll-animate {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-animate.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .transition-delay-100 { transition-delay: 100ms; }
        .transition-delay-200 { transition-delay: 200ms; }
        .transition-delay-300 { transition-delay: 300ms; }
        @keyframes progress-move {
          0% { left: -30%; }
          100% { left: 100%; }
        }
        @keyframes progress-move-vertical {
          0% { top: -30%; }
          100% { top: 100%; }
        }
        .timeline-progress-bar {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 30%;
          background: linear-gradient(90deg, transparent, var(--accent-color, #2563EB), transparent);
          animation: progress-move 3s linear infinite;
        }
        .timeline-progress-bar-vertical {
          position: absolute;
          left: 0;
          right: 0;
          height: 30%;
          background: linear-gradient(180deg, transparent, var(--accent-color, #2563EB), transparent);
          animation: progress-move-vertical 3s linear infinite;
        }
      `}</style>

      {/* Navbar with subtle glassmorphism and increased height (72px to 80px) */}
      <header 
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        className={`sticky top-0 z-50 transition-all duration-300 flex items-center justify-between border-b ${
          isScrolled 
            ? 'bg-white/70 border-slate-200/60 shadow-sm h-[72px]' 
            : 'bg-white/95 border-slate-100 h-[80px]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-8 w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="TaskPilot Logo" className="h-9 w-9 object-contain" />
            <span className="font-bold text-xl tracking-tight text-slate-900">TaskPilot</span>
          </div>

          {/* Links with Pill Background Hover effects */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold uppercase tracking-wider">
            <a 
              href="#features" 
              onClick={(e) => handleSmoothScroll(e, 'features')}
              className={`transition-all duration-250 py-1.5 px-3.5 rounded-lg ${
                activeSection === 'features' 
                  ? 'text-blue-650 bg-blue-50/70 font-bold' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/60'
              }`}
            >
              Features
            </a>
            <a 
              href="#about" 
              onClick={(e) => handleSmoothScroll(e, 'about')}
              className={`transition-all duration-250 py-1.5 px-3.5 rounded-lg ${
                activeSection === 'about' 
                  ? 'text-blue-650 bg-blue-50/70 font-bold' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/60'
              }`}
            >
              About
            </a>
          </nav>

          <div className="flex items-center space-x-3.5">
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-800 transition-all shadow-sm cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Content with Fade Up */}
          <div className="lg:col-span-5 text-left space-y-6">
            <div className="inline-flex items-center space-x-2 bg-blue-50/60 px-3 py-1 rounded-full text-blue-600 animate-fade-up" style={{ animationDelay: '100ms' }}>
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Presenting TaskPilot 1.0</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.1] animate-fade-up" style={{ animationDelay: '200ms' }}>
              Project Management Without the Chaos.
            </h1>
            
            <p className="text-slate-500 text-sm md:text-base leading-relaxed animate-fade-up" style={{ animationDelay: '300ms' }}>
              Streamline workflows, checklist tasks, and analyze sprint targets inside a clean, modern SaaS tool. Designed for builders who value deep focus.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 animate-fade-up" style={{ animationDelay: '400ms' }}>
              <Link 
                to="/register" 
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Get Started for Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                to="/login" 
                className="px-5 py-3 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-all bg-white hover:bg-slate-50 flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
              >
                <span>Sign In</span>
              </Link>
            </div>
          </div>

          {/* Right Hero Content: Modern Project Management Ecosystem Visual Block */}
          <div className="lg:col-span-7 relative flex items-center justify-center p-4">
            {/* Glowing background highlights */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute top-1/4 left-3/4 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />

            {/* Main Interactive Ecosystem Area */}
            <div className="relative w-full max-w-[500px] h-[380px] select-none animate-scale-in" style={{ animationDelay: '300ms' }}>
              
              {/* SVG Connecting Flow Lines */}
              <svg viewBox="0 0 500 380" className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <linearGradient id="ecosystem-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                {/* Node Connection Lines */}
                <path d="M 120 70 Q 250 50 250 140" fill="none" stroke="url(#ecosystem-gradient)" strokeWidth="2.5" className="connecting-line" />
                <path d="M 380 75 Q 250 55 250 140" fill="none" stroke="url(#ecosystem-gradient)" strokeWidth="2.5" className="connecting-line" />
                <path d="M 250 240 Q 250 330 110 320" fill="none" stroke="url(#ecosystem-gradient)" strokeWidth="2.5" className="connecting-line" />
                <path d="M 250 240 Q 250 335 390 315" fill="none" stroke="url(#ecosystem-gradient)" strokeWidth="2.5" className="connecting-line" />
              </svg>

              {/* Ecosystem Center Hub Node: Team Activity Dashboard */}
              <div className="absolute left-[28%] top-[34%] w-56 bg-white border border-slate-200/70 rounded-2xl shadow-xl p-4 z-10 animate-float-slow hover:shadow-2xl transition-all">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                    Workspace Hub
                  </span>
                  <div className="flex -space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-[7px] font-bold text-blue-600 flex items-center justify-center border border-white">N</span>
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-[7px] font-bold text-emerald-600 flex items-center justify-center border border-white">R</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] text-slate-500">
                    <span>Task Backlog</span>
                    <span className="font-bold text-slate-800">14 pending</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full w-[65%] rounded-full" />
                  </div>
                </div>
              </div>

              {/* Floating Node 1: Top Left - Folder Card */}
              <div className="absolute left-[4%] top-[8%] w-40 bg-white border border-slate-200/60 rounded-xl shadow-lg p-3 z-10 animate-float-medium hover:shadow-xl transition-all">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
                    <Folder className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-extrabold text-slate-800 truncate leading-snug">Marketing Sprint</span>
                    <span className="text-[8px] font-semibold text-slate-400">Project track</span>
                  </div>
                </div>
              </div>

              {/* Floating Node 2: Top Right - Progress Ring Card */}
              <div className="absolute right-[4%] top-[6%] w-36 bg-white border border-slate-200/60 rounded-xl shadow-lg p-3 z-10 animate-float-fast hover:shadow-xl transition-all">
                <div className="flex items-center space-x-3">
                  <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="16" cy="16" r="13" className="stroke-slate-100 fill-none" strokeWidth="2.5" />
                      <circle cx="16" cy="16" r="13" className="stroke-blue-600 fill-none" strokeWidth="2.5" strokeDasharray="81.68" strokeDashoffset="18" />
                    </svg>
                    <span className="absolute text-[8px] font-bold text-slate-800">78%</span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-extrabold text-slate-800 leading-none">Sprint Metrics</span>
                    <span className="text-[7.5px] text-slate-400 font-semibold mt-1 block">18 Completed</span>
                  </div>
                </div>
              </div>

              {/* Floating Node 3: Bottom Left - Task Card with Status Badges */}
              <div className="absolute left-[2%] bottom-[8%] w-44 bg-white border border-slate-200/60 rounded-xl shadow-lg p-3.5 z-10 animate-float-slow hover:shadow-xl transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-bold">IN PROGRESS</span>
                    <span className="text-[7px] text-slate-400 font-medium">Due Today</span>
                  </div>
                  <span className="block text-[10.5px] font-bold text-slate-800 leading-tight">Integrate Auth Handlers</span>
                  <div className="flex items-center justify-between text-[8px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1 font-semibold"><CheckCircle2 className="h-2 w-2 text-emerald-500" /> Done</span>
                    <span className="w-4 h-4 rounded-full bg-blue-100 font-bold text-blue-600 flex items-center justify-center">N</span>
                  </div>
                </div>
              </div>

              {/* Floating Node 4: Bottom Right - Notification Alert Card */}
              <div className="absolute right-[2%] bottom-[6%] w-44 bg-white border border-slate-200/60 rounded-xl shadow-lg p-3 z-10 animate-float-medium hover:shadow-xl transition-all">
                <div className="flex items-start space-x-2.5">
                  <div className="relative mt-0.5">
                    <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                      <Bell className="h-3.5 w-3.5" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9.5px] text-slate-700 leading-tight">
                      <span className="font-bold">Rahul</span> added a comment to UI Redesign
                    </p>
                    <span className="text-[7.5px] text-slate-400 mt-1 block">Just now</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Side Info */}
            <div className="lg:col-span-5 text-left space-y-6 scroll-animate">
              <div className="inline-flex items-center space-x-2 bg-blue-50/80 dark:bg-violet-950/15 px-3 py-1 rounded-full text-blue-600 dark:text-violet-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">WORKSPACE POWERHOUSE</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-[1.1]">
                Features built for focus.
              </h2>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                We stripped away the complexity of heavy analytical reports, marketing cards, and giant statistics. TaskPilot provides the essential pillars of productivity.
              </p>

              <div className="pt-2">
                <Link 
                  to="/register" 
                  className="px-5 py-3 bg-blue-600 dark:bg-violet-600 hover:bg-blue-700 dark:hover:bg-violet-750 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center space-x-2 cursor-pointer"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right Side Interactive Feature Showcase Card */}
            <div className="lg:col-span-7 scroll-animate transition-delay-200">
              <div className="bg-white/85 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
                {/* Glow backlight */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 dark:bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Smart Project Management",
                      desc: "Create & organize custom workspaces",
                      icon: FolderKanban,
                      status: "Active"
                    },
                    {
                      title: "Intelligent Task Tracking",
                      desc: "Priorities, metrics, and assignments",
                      icon: CheckCircle2,
                      status: "Live"
                    },
                    {
                      title: "Team Collaboration",
                      desc: "Comments, notifications, activity feeds",
                      icon: Users,
                      status: "Ready"
                    },
                    {
                      title: "Activity Feed",
                      desc: "Monitor team productivity in real time",
                      icon: TrendingUp,
                      status: "Online"
                    },
                    {
                      title: "File Sharing",
                      desc: "Upload screenshots & doc assets",
                      icon: FileText,
                      status: "Active"
                    },
                    {
                      title: "Team Workspaces",
                      desc: "Separate business, marketing, or dev",
                      icon: Folder,
                      status: "Online"
                    }
                  ].map((f, i) => (
                    <div 
                      key={i} 
                      className="group flex flex-col justify-between px-[28px] py-[24px] rounded-2xl border border-slate-100/60 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/40 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 hover:border-blue-500/20 dark:hover:border-violet-500/20 hover:shadow-xs transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 text-blue-600 dark:text-violet-450 rounded-xl group-hover:scale-105 transition-transform duration-300 relative overflow-hidden">
                          <div className="absolute inset-0 bg-blue-500/5 dark:bg-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <f.icon className="h-5 w-5 text-blue-600 dark:text-violet-400 relative z-10" />
                        </div>
                        <span className="flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md text-[8px] font-bold tracking-wider uppercase">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{f.status}</span>
                        </span>
                      </div>
                      <div className="mt-[15px] flex flex-col gap-[13px]">
                        <h4 className="text-[15px] font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-violet-400 transition-colors leading-snug">{f.title}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 opacity-70 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-28 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-20 relative z-10">
          <div className="max-w-xl mx-auto space-y-4 scroll-animate">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-tight">
              Start Managing Projects in 3 Simple Steps
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-lg mx-auto">
              Everything you need to organize work, collaborate with your team, and deliver projects faster.
            </p>
          </div>

          {/* Timeline container */}
          <div className="relative max-w-5xl mx-auto">
            {/* Desktop Connecting Line (hidden on mobile) */}
            <div className="hidden md:block absolute top-[36px] left-[16.6%] right-[16.6%] h-[2px] bg-slate-100 dark:bg-slate-800/80 z-0 overflow-hidden">
              <div className="timeline-progress-bar" />
            </div>

            {/* Mobile Connecting Line (hidden on desktop) */}
            <div className="md:hidden absolute top-[36px] bottom-[36px] left-[36px] w-[2px] bg-slate-100 dark:bg-slate-800/80 z-0 overflow-hidden">
              <div className="timeline-progress-bar-vertical" />
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 relative z-10 text-center">
              {/* Step 1 */}
              <div className="flex flex-col items-center px-6 group scroll-animate transition-delay-100">
                {/* Step Circle with Gradient Glow */}
                <div className="relative w-[72px] h-[72px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:shadow-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:border-blue-500 dark:group-hover:border-violet-500 group-hover:scale-105 mb-6 z-10">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-blue-500 dark:bg-violet-600 text-white rounded-full text-[9px] font-extrabold shadow-xs">
                    01
                  </span>
                  <Folder className="h-6 w-6 text-blue-600 dark:text-violet-400 relative z-10" />
                </div>
                
                {/* Glassmorphic Description Card */}
                <div className="w-full bg-white/50 dark:bg-slate-900/30 border border-slate-100/80 dark:border-slate-800/60 rounded-2xl p-6 shadow-xs hover:shadow-md dark:hover:shadow-[0_15px_30px_rgba(124,58,237,0.05)] hover:border-blue-500/20 dark:hover:border-violet-500/20 hover:-translate-y-1 transition-all duration-300 backdrop-blur-xs">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Create Your Workspace</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-2.5 leading-relaxed">
                    Set up a dedicated space for your projects and team.
                  </p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex flex-col items-center px-6 group scroll-animate transition-delay-200">
                <div className="relative w-[72px] h-[72px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:shadow-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:border-blue-500 dark:group-hover:border-violet-500 group-hover:scale-105 mb-6 z-10">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-blue-500 dark:bg-violet-600 text-white rounded-full text-[9px] font-extrabold shadow-xs">
                    02
                  </span>
                  <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-violet-400 relative z-10" />
                </div>
                
                <div className="w-full bg-white/50 dark:bg-slate-900/30 border border-slate-100/80 dark:border-slate-800/60 rounded-2xl p-6 shadow-xs hover:shadow-md dark:hover:shadow-[0_15px_30px_rgba(124,58,237,0.05)] hover:border-blue-500/20 dark:hover:border-violet-500/20 hover:-translate-y-1 transition-all duration-300 backdrop-blur-xs">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Manage Tasks</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-2.5 leading-relaxed">
                    Create tasks, assign members, set priorities and deadlines.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center px-6 group scroll-animate transition-delay-300">
                <div className="relative w-[72px] h-[72px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:shadow-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:border-blue-500 dark:group-hover:border-violet-500 group-hover:scale-105 mb-6 z-10">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-blue-500 dark:bg-violet-600 text-white rounded-full text-[9px] font-extrabold shadow-xs">
                    03
                  </span>
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-violet-400 relative z-10" />
                </div>
                
                <div className="w-full bg-white/50 dark:bg-slate-900/30 border border-slate-100/80 dark:border-slate-800/60 rounded-2xl p-6 shadow-xs hover:shadow-md dark:hover:shadow-[0_15px_30px_rgba(124,58,237,0.05)] hover:border-blue-500/20 dark:hover:border-violet-500/20 hover:-translate-y-1 transition-all duration-300 backdrop-blur-xs">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Track Progress</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-2.5 leading-relaxed">
                    Monitor productivity, activity feeds, and project completion in real time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Refined Final CTA Section */}
      <section className="py-16 md:py-20 bg-slate-50/30 scroll-animate">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
            Start Managing Projects Smarter
          </h2>
          <p className="text-slate-500 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            Organize tasks, collaborate with your team, and track progress in one place.
          </p>
          <div className="pt-2">
            <Link 
              to="/register" 
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center space-x-2 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="TaskPilot Logo" className="h-5 w-5 object-contain" />
            <span className="font-bold text-sm tracking-tight text-slate-900">TaskPilot</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">© {new Date().getFullYear()} TaskPilot Inc. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
