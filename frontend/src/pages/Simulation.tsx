/**
 * File: Simulation.tsx
 * Purpose: Test and Simulation control center page layout.
 * Why it exists: Provides test actuation controls for traffic operators to test emergency triggers and signal loads.
 */

import React from 'react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Card } from '../components/ui/Card';
import { useNotifications } from '../components/ui/Notifications';
import { Play, Flame, UserCheck, CloudRain } from 'lucide-react';

export const Simulation: React.FC = () => {
  const { addToast } = useNotifications();

  return (
    <div className="space-y-6">
      <Breadcrumbs paths={['System Controls', 'Simulation Desk']} />

      <div className="grid grid-cols-3 gap-6">
        {/* Card 1: Trigger Emergency Vehicle Simulation */}
        <Card variant="glass" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400">
              <Flame className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">Emergency Trigger</h4>
          </div>
          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
            Simulate a high-priority emergency vehicle approaching Junction Central from the North lane.
          </p>
          <button
            onClick={() => addToast('Simulated emergency vehicle dispatched.', 'warning')}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 px-3.5 py-2 text-[10px] font-bold text-white transition-colors"
          >
            <Play className="h-3 w-3" />
            <span>Simulate Ambulance</span>
          </button>
        </Card>

        {/* Card 2: Congestion Load simulation */}
        <Card variant="glass" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">Simulate Heavy Peak Flow</h4>
          </div>
          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
            Spawns 50+ virtual vehicles in the queue buffers to evaluate the AI pressure metrics.
          </p>
          <button
            onClick={() => addToast('Heavy peak traffic flow simulated.', 'info')}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/5 px-3.5 py-2 text-[10px] font-bold text-slate-300 transition-colors"
          >
            <Play className="h-3 w-3" />
            <span>Trigger Congestion Load</span>
          </button>
        </Card>

        {/* Card 3: Weather and visibility modifiers */}
        <Card variant="glass" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-400">
              <CloudRain className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">Environmental Modifiers</h4>
          </div>
          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
            Apply simulated low-visibility modifiers like rain, fog, or night-vision layers.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => addToast('Rain modifier applied.', 'info')}
              className="flex-1 rounded-lg bg-slate-900 border border-white/5 py-2 text-[9px] font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Simulate Rain
            </button>
            <button
              onClick={() => addToast('Night vision mode active.', 'info')}
              className="flex-1 rounded-lg bg-slate-900 border border-white/5 py-2 text-[9px] font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Simulate Night
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default Simulation;
