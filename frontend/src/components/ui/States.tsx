/**
 * File: States.tsx
 * Purpose: Reusable empty states, error states, and generic skeleton layouts.
 * Why it exists: Enforces consistent branding UI states across charts, tables, and streams.
 */

import React from 'react';
import { Database, AlertTriangle } from 'lucide-react';

interface StateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<StateProps> = ({ title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-white/5 bg-slate-950/20 backdrop-blur-md min-h-[220px]">
      <div className="rounded-full bg-slate-900 border border-white/5 p-3.5 mb-4 text-slate-500">
        <Database className="h-5 w-5" />
      </div>
      <h4 className="text-xs font-bold text-slate-200">{title}</h4>
      <p className="text-[10px] text-slate-500 mt-1 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-[10px] font-bold text-white transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<StateProps> = ({ title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-rose-500/10 bg-rose-950/5 backdrop-blur-md min-h-[220px]">
      <div className="rounded-full bg-rose-500/10 p-3.5 mb-4 text-rose-400">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h4 className="text-xs font-bold text-slate-200">{title}</h4>
      <p className="text-[10px] text-slate-500 mt-1 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-lg bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-[10px] font-bold text-white transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse rounded bg-white/5 ${className}`} />
  );
};
