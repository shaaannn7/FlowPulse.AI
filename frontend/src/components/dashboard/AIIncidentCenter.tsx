import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, ShieldAlert } from 'lucide-react';
import { Check, X, Play, BrainCircuit } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { playSynthesizedSound } from '../../lib/sound';
import { useDashboardStore } from '../../hooks/useDashboardStore';

interface Incident {
  id: number;
  title: string;
  reason: string;
  confidence: number;
  waitRed: number;
  co2Red: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export const AIIncidentCenter: React.FC = () => {
  const { theme } = useTheme();
  const { addEvent, setOptimizationReport } = useDashboardStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Proactive Mission Control AI Monitoring
  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() > 0.6 && incidents.length < 3) {
        
        const possibleIncidents = [
          {
            title: 'Critical Congestion Detected',
            reason: 'Queue growth anomaly on Broadway N-S. Re-routing required.',
            waitRed: 15, co2Red: 12, confidence: 94, priority: 'HIGH' as const
          },
          {
            title: 'Emergency Priority Preemption',
            reason: 'Ambulance approaching Sector 4. Green corridor sequence recommended.',
            waitRed: 34, co2Red: 5, confidence: 99, priority: 'CRITICAL' as const
          },
          {
            title: 'Weather Impact Analysis',
            reason: 'Sudden rain reducing braking coefficient. Speed limits adjusted.',
            waitRed: 8, co2Red: 2, confidence: 88, priority: 'MEDIUM' as const
          },
          {
            title: 'Signal Failure Imminent',
            reason: 'Hardware desynchronization detected at Junction Central. Fallback mode advised.',
            waitRed: 40, co2Red: 15, confidence: 91, priority: 'HIGH' as const
          }
        ];
        
        const randomIncident = possibleIncidents[Math.floor(Math.random() * possibleIncidents.length)];

        playSynthesizedSound('alert');
        setIncidents(prev => [{
          id: Date.now(),
          ...randomIncident
        }, ...prev]);
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [incidents]);

  if (incidents.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 space-y-4">
      <AnimatePresence>
        {incidents.map(inc => (
          <motion.div
            key={inc.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={`relative p-4 rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-slate-950/90 border-emerald-500/30' : 'bg-white/90 border-emerald-200'
            }`}
          >
            {/* Radar Sweep Effect */}
            <motion.div
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent pointer-events-none"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
            />
            
            <div className="relative z-10 flex items-center gap-2 mb-2">
              <BrainCircuit className="h-4 w-4 text-emerald-500" />
              <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>AI INCIDENT COMMAND</span>
              <span className="ml-auto text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">
                {inc.confidence}% CONFIDENCE
              </span>
            </div>
            
            <h4 className={`text-sm font-bold mb-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{inc.title}</h4>
            <p className={`text-[10px] mb-3 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{inc.reason}</p>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[8px] text-slate-500 block">WAIT REDUCTION</span>
                <span className="text-emerald-500 font-bold text-xs">-{inc.waitRed}%</span>
              </div>
              <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[8px] text-slate-500 block">CO₂ REDUCTION</span>
                <span className="text-emerald-500 font-bold text-xs">-{inc.co2Red}%</span>
              </div>
            </div>

            <div className="relative z-10 flex gap-2">
              <button 
                onClick={() => { 
                  playSynthesizedSound('click'); 
                  addEvent({
                    level: inc.priority === 'CRITICAL' ? 'ERROR' : 'WARNING',
                    message: `Applied Fix: ${inc.title}`,
                    source: 'AI Command',
                    aiReasoning: inc.reason,
                    operatorAction: 'Authorized System Intervention',
                    result: `Estimated -${inc.waitRed}% Wait / -${inc.co2Red}% CO2`,
                    affectedRoads: ['Broadway N-S', 'West Blvd'],
                  });
                  
                  // Trigger Phase 7 Before/After Engine
                  setTimeout(() => {
                    setOptimizationReport({
                      visible: true,
                      title: inc.title,
                      metrics: [
                        { label: 'Traffic Health', before: '41/100', after: '92/100', improvement: 124, icon: <Activity className="h-4 w-4" /> },
                        { label: 'Wait Time', before: '142s', after: '34s', improvement: 76, icon: <Clock className="h-4 w-4" /> },
                        { label: 'Congestion', before: '88%', after: '12%', improvement: 86, icon: <ShieldAlert className="h-4 w-4" /> }
                      ]
                    });
                    playSynthesizedSound('notification');
                  }, 2000);

                  setIncidents(prev => prev.filter(i => i.id !== inc.id)); 
                }} 
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                <Check className="h-3 w-3" /> APPLY
              </button>
              <button onClick={() => playSynthesizedSound('click')} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-white/10 bg-transparent hover:bg-white/5 text-slate-400 text-[10px] font-bold transition-colors">
                <Play className="h-3 w-3" /> SIMULATE
              </button>
              <button onClick={() => { playSynthesizedSound('click'); setIncidents(prev => prev.filter(i => i.id !== inc.id)); }} className="flex items-center justify-center px-3 py-1.5 rounded border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
