import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Activity, ShieldAlert, Crosshair, PlayCircle } from 'lucide-react';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { Card } from '../ui/Card';
import { playSynthesizedSound } from '../../lib/sound';

export const MissionControlPanel: React.FC = () => {
  const { missionState, setMissionState, simState } = useDashboardStore();
  const [missionDuration, setMissionDuration] = useState(0);

  // Auto-advance mission state based on simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (missionState === 'IDLE') {
      // Start mission automatically for demo
      timer = setTimeout(() => {
        setMissionState('SCANNING');
        playSynthesizedSound('click');
      }, 2000);
    } else if (missionState === 'SCANNING') {
      timer = setTimeout(() => setMissionState('THREAT_ASSESSMENT'), 3000);
    } else if (missionState === 'THREAT_ASSESSMENT') {
      if (simState.activeEmergency !== 'none' || simState.trafficLoad === 'heavy') {
        setMissionState('OPTIMIZING');
      } else {
        setMissionState('MONITORING');
      }
    } else if (missionState === 'OPTIMIZING') {
      timer = setTimeout(() => setMissionState('MONITORING'), 5000);
    }
    return () => clearTimeout(timer);
  }, [missionState, simState, setMissionState]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (missionState !== 'IDLE' && missionState !== 'COMPLETE') {
        setMissionDuration(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [missionState]);

  const getPhaseColor = () => {
    switch (missionState) {
      case 'SCANNING': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'THREAT_ASSESSMENT': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'OPTIMIZING': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'MONITORING': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'COMPLETE': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const riskLevel = simState.signalFailure ? 'CRITICAL' : simState.activeEmergency !== 'none' ? 'HIGH' : simState.trafficLoad === 'heavy' ? 'MEDIUM' : 'LOW';
  const riskColor = riskLevel === 'CRITICAL' ? 'text-rose-500' : riskLevel === 'HIGH' ? 'text-orange-500' : riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500';
  
  const successProbability = riskLevel === 'CRITICAL' ? 45 : riskLevel === 'HIGH' ? 82 : 98;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <Card variant="glass" className="mb-6 p-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 pointer-events-none"
        animate={{ x: ['-200%', '200%'] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
      />
      
      <div className="relative z-10 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6">
        {/* Mission Identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <Target className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Current Mission</h3>
            <p className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              OPERATION: CLEAR-PATH
              {missionState !== 'IDLE' && missionState !== 'COMPLETE' && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </p>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Lifecycle Phase</span>
          <div className={`px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase flex items-center gap-2 ${getPhaseColor()}`}>
            {missionState === 'SCANNING' && <Activity className="h-3 w-3 animate-pulse" />}
            {missionState === 'THREAT_ASSESSMENT' && <ShieldAlert className="h-3 w-3 animate-bounce" />}
            {missionState === 'OPTIMIZING' && <Crosshair className="h-3 w-3 animate-spin-slow" />}
            {missionState === 'MONITORING' && <PlayCircle className="h-3 w-3 animate-pulse" />}
            {missionState.replace('_', ' ')}
          </div>
        </div>

        {/* Telemetry KPIs */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-0.5">Duration</span>
            <span className="text-xl font-mono font-black text-emerald-400">{formatTime(missionDuration)}</span>
          </div>
          
          <div className="text-right border-l border-white/10 pl-6">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-0.5">Risk Level</span>
            <span className={`text-lg font-black tracking-wider ${riskColor}`}>{riskLevel}</span>
          </div>

          <div className="text-right border-l border-white/10 pl-6">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-0.5">Success Prob</span>
            <span className="text-lg font-mono font-black text-white">{successProbability}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
