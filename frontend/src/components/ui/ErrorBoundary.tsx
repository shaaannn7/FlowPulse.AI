/**
 * File: ErrorBoundary.tsx
 * Purpose: Global Error Boundary layout component catching client runtime rendering crashes.
 * Why it exists: Prevents single component crashes from breaking the entire operator dashboard.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside FlowPulse UI:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#090A0F] text-slate-100 p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/20 bg-rose-950/10 p-6 text-center backdrop-blur-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-slate-100 mb-2">Interface Engine Crash</h2>
            <p className="text-xs text-slate-400 mb-4">
              A fatal rendering error occurred in the dashboard engine. Normal signal operation continues.
            </p>
            <pre className="overflow-x-auto rounded bg-black/40 p-3 text-[10px] text-rose-300 font-mono text-left mb-4">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
            >
              Restart Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
