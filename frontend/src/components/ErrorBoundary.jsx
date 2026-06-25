import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 my-8 text-left max-w-2xl mx-auto shadow-sm">
            <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">Something went wrong</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 text-center">
              {this.state.error?.message || 'An unexpected runtime error occurred in this view.'}
            </p>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
