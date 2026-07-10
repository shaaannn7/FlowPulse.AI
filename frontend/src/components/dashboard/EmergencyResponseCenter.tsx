/**
 * File: EmergencyResponseCenter.tsx
 * Purpose: Emergency Response priority tracker.
 * Why it exists: Displays active priority corridors, clearance times, and override states during emergency approaches.
 */

import React from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { ShieldAlert, AlertTriangle, Route } from 'lucide-react';

export const EmergencyResponseCenter: React.FC = () => {
  const { simState } = useDashboardStore();

  const isEmergency = simState.activeEmergency !== 'none';

  if (!isEmergency) {
    return (
      <Card variant="glass" className="flex flex-col items-center justify-center text-center p-6 min-h-[160px]">
        <div className="rounded-full bg-slate-900 border border-white/5 p-2.5 text-slate-500 mb-3">
          <Route className="h-4 w-4" />
        </div>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase">Emergency Response Center</h4>
        <p className="text-[9px] text-slate-550 mt-1">No emergency preemption signals active on the grid corridor.</p>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="space-y-4 border-rose-500/10 bg-rose-950/5">
      <div className="flex items-center gap-2 border-b border-rose-500/10 pb-3">
        <ShieldAlert className="h-4 w-4 text-rose-450 animate-bounce" />
        <div>
          <h4 className="text-xs font-bold text-rose-400">Emergency Corridor Override</h4>
          <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Priority routing active northbound</p>
        </div>
      </div>

      <div className="space-y-3 font-mono text-[9px] text-slate-400 leading-relaxed">
        <div className="flex justify-between border-b border-white/5 pb-1.5">
          <span>Approaching vehicle:</span>
          <span className="text-rose-400 font-bold uppercase">{simState.activeEmergency}</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-1.5">
          <span>Assigned Corridors:</span>
          <span className="text-slate-200">Broadway (North-South Green)</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-1.5">
          <span>Actuation Preemption:</span>
          <span className="text-emerald-450 font-bold">ACTUATED</span>
        </div>
        <div className="flex justify-between">
          <span>Est. clearance:</span>
          <span className="text-rose-400 font-bold animate-pulse">12 seconds</span>
        </div>
      </div>

      {/* Override Warning banner */}
      <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/15 p-2.5">
        <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-rose-400 leading-relaxed font-semibold">
          AI Adaptive signal loops have been temporarily preempted. Cross-traffic directions hold RED.
        </p>
      </div>
    </Card>
  );
};
export default EmergencyResponseCenter;
