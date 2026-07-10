/**
 * File: NotFound.tsx
 * Purpose: 404 Route Fallback Layout page.
 * Why it exists: Provides a premium glassmorphic error layout for invalid routing requests.
 */

import React from 'react';
import { Card } from '../components/ui/Card';
import { ShieldQuestion } from 'lucide-react';

export const NotFound: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090A0F] text-slate-100 p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-rose-500/10 blur-[130px] pointer-events-none" />

      <Card variant="solid" className="max-w-md w-full border-white/5 bg-slate-950/45 p-10 text-center shadow-2xl relative z-10 space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-450 border border-rose-500/20">
          <ShieldQuestion className="h-6 w-6" />
        </div>
        
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-200">Route Not Found</h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            The requested routing endpoint does not exist or has been revoked by controller security filters.
          </p>
        </div>

        <button
          onClick={onBack}
          className="w-full rounded-xl bg-slate-900 border border-white/5 hover:bg-slate-800 py-3 text-xs font-bold text-slate-350 transition-colors"
        >
          Return to Monitor Console
        </button>
      </Card>
    </div>
  );
};
export default NotFound;
