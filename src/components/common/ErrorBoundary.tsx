import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Enterprise-grade Error Boundary
 * Prevents unhandled React rendering exceptions from crashing the frameless Electron window.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[FloatCompanion] Uncaught UI Exception:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 text-slate-100 rounded-3xl border border-red-500/40 select-none">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
          </div>
          <h2 className="text-sm font-bold text-white mb-1">Interface Error Intercepted</h2>
          <p className="text-xs text-slate-400 max-w-[280px] mb-4 font-mono leading-relaxed line-clamp-3">
            {this.state.error?.message || 'A component runtime exception occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Recover Interface</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
