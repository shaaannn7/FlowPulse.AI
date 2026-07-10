/**
 * File: Loading.tsx
 * Purpose: Reusable loading spinners and skeleton placeholders.
 * Why it exists: Provides smooth loading states for charts, maps, and video feeds.
 */

import React from 'react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dims = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6';
  return (
    <div className={`animate-spin rounded-full border-2 border-white/10 border-t-emerald-400 ${dims}`} />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-slate-900/40 p-6 space-y-4">
      <div className="h-4 w-1/3 rounded bg-white/5" />
      <div className="h-10 w-2/3 rounded bg-white/5" />
      <div className="h-3 w-1/2 rounded bg-white/5" />
    </div>
  );
};
export default Spinner;
