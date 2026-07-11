import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeProvider';
import MeetingMiniWindow from './MeetingMiniWindow';
import AIAssistant from './AIAssistant';
import Avatar from './Avatar';
import {
  LayoutDashboard,
  FolderKanban,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Settings,
  MessageSquare,
  UserRoundPlus,
  CalendarDays,
  Bot,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { currentUser, conversations, incomingConnectionRequests = [] } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const messagesUnreadCount = (conversations || []).reduce((total, conversation) => total + (conversation.unreadCount || 0), 0);
  const networkIncomingCount = (incomingConnectionRequests || []).length;
  const newestIncomingRequestId = incomingConnectionRequests?.[0]?._id || incomingConnectionRequests?.[0]?.id || '';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Network', path: '/network', icon: UserRoundPlus },
    { name: 'AI', path: '/ai', icon: Bot },
    { name: 'Calendar', path: '/calendar', icon: CalendarDays },
  ];

  return (
    <div className="app-layout min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-700 dark:text-slate-300 font-sans transition-colors duration-200">
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-[100] transition-colors duration-200">
        <div className="flex items-center space-x-2.5">
          <img src="/logo.png" alt="TaskPilot Logo" className="h-7 w-7 object-contain" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">TaskPilot</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      <aside className={`
        fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:fixed md:translate-x-0 md:inset-y-auto md:top-4 md:bottom-4 md:left-4
        w-[260px] h-screen md:h-[calc(100vh-2rem)]
        bg-white dark:bg-slate-900
        border-r md:border border-slate-100 dark:border-slate-800
        md:rounded-2xl flex flex-col z-[100] transition-all duration-300 shadow-xl
      `}>
        <div className="px-5 py-6 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="hidden md:flex items-center gap-3 mb-9 shrink-0">
            <div className="flex min-w-0 items-center space-x-3">
              <img src="/logo.png" alt="TaskPilot Logo" className="h-8 w-8 object-contain" />
              <span className="truncate font-bold text-lg tracking-tight text-slate-900 dark:text-white">TaskPilot</span>
            </div>

          </div>

          <nav className="space-y-1 overflow-y-auto pr-1 no-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path === '/projects' && location.pathname.startsWith('/projects/')) ||
                (item.path === '/ai' && location.pathname.startsWith('/ai'));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  state={item.name === 'Network' && networkIncomingCount > 0 ? { networkTab: 'requests', requestList: 'incoming', connectionId: newestIncomingRequestId } : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150
                    ${isActive
                      ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border border-violet-100/30 dark:border-violet-900/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/30'}
                  `}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className={`${item.name === 'AI' ? 'h-5 w-5' : 'h-4.5 w-4.5'} shrink-0 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.name === 'Messages' && messagesUnreadCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {messagesUnreadCount > 99 ? '99+' : messagesUnreadCount}
                    </span>
                  )}
                  {item.name === 'Network' && networkIncomingCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {networkIncomingCount > 99 ? '99+' : networkIncomingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {currentUser && (
          <div ref={profileMenuRef} className="p-4 border-t border-slate-100 dark:border-slate-800 relative shrink-0">
            {profileMenuOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl z-40 p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left">
                <button onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }} className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-left">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>View Profile</span>
                </button>
                <button onClick={toggleTheme} className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                  <div className="flex items-center space-x-2.5">
                    {theme === 'dark' ? <><Sun className="h-4 w-4 text-amber-500" /><span>Light Mode</span></> : <><Moon className="h-4 w-4 text-slate-400" /><span>Dark Mode</span></>}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{theme === 'dark' ? 'Dark Active' : 'Light Active'}</span>
                </button>
                <button onClick={() => { setProfileMenuOpen(false); navigate('/settings'); }} className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-left">
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span>Settings</span>
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                <button onClick={() => { setProfileMenuOpen(false); handleLogout(); }} className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer text-left">
                  <LogOut className="h-4 w-4 text-rose-500" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800/60 transition-all cursor-pointer">
              <div className="flex items-center space-x-3 overflow-hidden">
                <Avatar name={currentUser.name} avatar={currentUser.avatar} className="h-9 w-9 text-[12px] border border-slate-200 dark:border-slate-700" />
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{currentUser.name}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{currentUser.title}</span>
                </div>
              </div>
              <div className="text-slate-400 dark:text-slate-500 pl-1 shrink-0">
                {profileMenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>
          </div>
        )}
      </aside>

      <MeetingMiniWindow />
      <AIAssistant />
      <main className="flex-1 min-w-0 flex flex-col min-h-screen md:pl-[292px]">
        <div className="flex-1 p-6 md:p-10 max-w-6.5xl w-full mx-auto">
          {children}
        </div>
      </main>

      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-[90] md:hidden" />}
    </div>
  );
};

export default Layout;
