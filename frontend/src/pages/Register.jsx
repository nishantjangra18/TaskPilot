import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeProvider';
import GoogleAuthButton, { AuthDivider } from '../components/GoogleAuthButton';
import { ArrowRight, Sun, Moon } from 'lucide-react';

const Register = () => {
  const { register, signInWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await register(name, email, password);
      setLoading(false);
      if (res.success) {
        showAuthToast({ type: 'success', title: 'Account created successfully' });
        navigate('/dashboard');
      } else {
        setError(res.message);
        showAuthToast({ type: 'error', title: 'Authentication failed', description: res.message });
      }
    } catch (err) {
      setLoading(false);
      const message = 'An unexpected error occurred. Please try again.';
      setError(message);
      showAuthToast({ type: 'error', title: 'Authentication failed', description: message });
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setGoogleLoading(true);
    const res = await signInWithGoogle();
    setGoogleLoading(false);

    if (res.success) {
      showAuthToast({ type: 'success', title: 'Signed up with Google', description: 'Your TaskPilot account is ready.' });
      navigate('/dashboard');
      return;
    }

    setError(res.message);
    showAuthToast({ type: 'error', title: 'Authentication failed', description: res.message });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] flex flex-col justify-center items-center p-6 relative">
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-800 transition-all shadow-sm z-50 cursor-pointer"
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      {/* Brand Header */}
      <div className="flex items-center space-x-2.5 mb-8">
        <img src="/logo.png" alt="TaskPilot Logo" className="h-9 w-9 object-contain" />
        <span className="font-bold text-2xl tracking-tight text-slate-900">TaskPilot</span>
      </div>

      {/* Register Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 md:p-10 shadow-sm border border-slate-100 dark:border-slate-800 max-w-md w-full transition-all duration-300">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Create your account</h2>
          <p className="text-sm text-slate-400 mt-1">Get started with professional project management</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full name</label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-all"
              placeholder="e.g. Nishant Jangra"
              disabled={loading || googleLoading}
              id="register-name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email address</label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-all"
              placeholder="you@example.com"
              disabled={loading || googleLoading}
              id="register-email"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-950 focus:border-violet-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-all"
              placeholder="Min. 8 characters"
              minLength={8}
              disabled={loading || googleLoading}
              id="register-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors flex items-center justify-center space-x-2 mt-6 cursor-pointer disabled:opacity-50"
            id="register-submit"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <AuthDivider />
        <GoogleAuthButton onClick={handleGoogleAuth} loading={googleLoading} disabled={loading}>
          Sign up with Google
        </GoogleAuthButton>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

