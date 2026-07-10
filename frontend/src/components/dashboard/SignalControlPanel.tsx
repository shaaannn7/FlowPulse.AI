import React from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const SignalControlPanel: React.FC = () => {
  const { activePhase, secondsRemaining, mode, simState } = useDashboardStore();

  const loadMultiplier = simState.trafficLoad === 'heavy' ? 2.0 : simState.trafficLoad === 'light' ? 0.4 : 1.0;

  const directions = [
    { id: 'north', label: 'North Bound (Broadway)', phase: 'NORTH_SOUTH', queue: Math.round(5 * loadMultiplier), priority: 'HIGH' },
    { id: 'south', label: 'South Bound (Broadway)', phase: 'NORTH_SOUTH', queue: Math.round(4 * loadMultiplier), priority: 'MEDIUM' },
    { id: 'east', label: 'East Bound (42nd St)', phase: 'EAST_WEST', queue: Math.round(3 * loadMultiplier), priority: 'LOW' },
    { id: 'west', label: 'West Bound (42nd St)', phase: 'EAST_WEST', queue: Math.round(3 * loadMultiplier), priority: 'LOW' },
  ];

  return (
    <Card variant="glass" className="space-y-4">
      {/* Panel Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Actuation Controllers</h3>
          <p className="text-[9px] text-slate-500 font-bold font-mono mt-0.5">Junction central physical actuators</p>
        </div>
        <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 bg-slate-900 border border-white/5 px-2.5 py-1 rounded-full font-mono">
          {mode === 'AUTO' ? (
            <>
              <ToggleRight className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400">AUTO PILOT</span>
            </>
          ) : (
            <>
              <ToggleLeft className="h-4 w-4 text-amber-500 animate-pulse" />
              <span className="text-amber-500">MANUAL OVERRIDE</span>
            </>
          )}
        </span>
      </div>

      {/* Grid of Direction Cards */}
      <div className="grid grid-cols-2 gap-4">
        {directions.map((dir) => {
          const isCurrentPhase = activePhase === dir.phase;
          const isAmber = secondsRemaining <= 4 && secondsRemaining > 0;
          
          let stateLabel = 'RED';
          let ringColor = 'border-rose-500/10 text-rose-400 bg-rose-950/5';
          let lightRed = 'bg-rose-600 shadow-[0_0_12px_rgba(239,68,68,0.5)]';
          let lightYellow = 'bg-slate-800';
          let lightGreen = 'bg-slate-800';

          if (simState.signalFailure) {
            stateLabel = 'FAIL';
            ringColor = 'border-amber-500/15 text-amber-450 bg-amber-950/5 animate-pulse';
            lightRed = 'bg-slate-800';
            lightYellow = 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-ping';
            lightGreen = 'bg-slate-800';
          } else if (isCurrentPhase) {
            if (isAmber) {
              stateLabel = 'AMBER';
              ringColor = 'border-amber-500/15 text-amber-400 bg-amber-950/5';
              lightRed = 'bg-slate-800';
              lightYellow = 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
              lightGreen = 'bg-slate-800';
            } else {
              stateLabel = 'GREEN';
              ringColor = 'border-emerald-500/15 text-emerald-400 bg-emerald-950/5';
              lightRed = 'bg-slate-800';
              lightYellow = 'bg-slate-800';
              lightGreen = 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]';
            }
          }

          return (
            <div
              key={dir.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between min-h-[140px] transition-all bg-slate-950/20 ${ringColor}`}
            >
              {/* Card Header: Labels & Traffic Light Module */}
              <div className="flex justify-between items-start">
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] font-black text-slate-200 tracking-wide leading-tight">
                    {dir.id.toUpperCase()}
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold font-mono">
                    {dir.priority} PRIORITY
                  </span>
                </div>

                {/* Micro Traffic Light Module */}
                <div className="flex flex-col items-center gap-1 bg-slate-950 border border-white/5 rounded-full px-1.5 py-2 shadow-inner">
                  <span className="sr-only">Signal state: {stateLabel}</span>
                  <span className={`h-2.5 w-2.5 rounded-full transition-all duration-305 ${lightRed}`} />
                  <span className={`h-2.5 w-2.5 rounded-full transition-all duration-305 ${lightYellow}`} />
                  <span className={`h-2.5 w-2.5 rounded-full transition-all duration-305 ${lightGreen}`} />
                </div>
              </div>

              {/* Card Footer: Queue details and Countdown clocks */}
              <div className="flex justify-between items-end mt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[7px] text-slate-500 font-black uppercase tracking-wider font-mono">Queue size</span>
                  <span className="text-xs font-black text-slate-200 font-mono">{dir.queue} vehicles</span>
                  {/* Dynamic Queue length bar */}
                  <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                    <motion.div
                      className={`h-full ${
                        dir.queue >= 8 ? 'bg-rose-500' : dir.queue >= 4 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (dir.queue / 10) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Countdown Ring timer */}
                {isCurrentPhase && !simState.signalFailure && (
                  <div className="relative flex items-center justify-center">
                    <svg className="w-9 h-9 transform -rotate-90">
                      <circle cx="18" cy="18" r="14" className="stroke-slate-900 fill-transparent" strokeWidth="2.5" />
                      <motion.circle
                        cx="18"
                        cy="18"
                        r="14"
                        className={`fill-transparent ${isAmber ? 'stroke-amber-500' : 'stroke-emerald-500'}`}
                        strokeWidth="2.5"
                        strokeDasharray={2 * Math.PI * 14}
                        animate={{ strokeDashoffset: (2 * Math.PI * 14) * (1 - secondsRemaining / 30) }}
                      />
                    </svg>
                    <span className="absolute text-[9px] font-black text-white font-mono">
                      {secondsRemaining}s
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default SignalControlPanel;
