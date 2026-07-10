import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, CheckCircle, TrendingUp, Zap, ShieldAlert, Activity, X } from 'lucide-react';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { useWebSocket } from '../../context/WebSocketContext';
import { playSynthesizedSound } from '../../lib/sound';

export const SessionReportModal: React.FC = () => {
  const { missionState, setMissionState, events } = useDashboardStore();
  const { lastMetrics } = useWebSocket();

  if (missionState !== 'COMPLETE') return null;

  const handleClose = () => {
    playSynthesizedSound('click');
    setMissionState('IDLE');
  };

  const handleExport = () => {
    playSynthesizedSound('alert');
    // Simulated export logic
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('FlowPulse AI Session Report\n\n...');
    a.download = `Session_Report_${new Date().toISOString()}.txt`;
    a.click();
  };

  const kpis = [
    { label: 'Final Traffic Health', value: lastMetrics?.health_score || 94, icon: <HeartbeatIcon /> },
    { label: 'Total Interventions', value: events.length, icon: <ShieldAlert className="h-4 w-4" /> },
    { label: 'CO₂ Avoided', value: '24kg', icon: <Zap className="h-4 w-4" /> },
    { label: 'Avg Speed Increase', value: '+14%', icon: <TrendingUp className="h-4 w-4" /> },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-[2rem] border border-emerald-500/30 bg-slate-900 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 bg-slate-950/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">Executive Session Report</h2>
                <p className="text-sm font-semibold text-slate-400">Mission: OPERATION CLEAR-PATH • {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-200 transition-colors">
                <Download className="h-4 w-4" /> EXPORT REPORT
              </button>
              <button onClick={handleClose} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {/* KPI Grid */}
            <div className="grid grid-cols-4 gap-4">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-950/50 border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    {kpi.icon} {kpi.label}
                  </div>
                  <div className="text-4xl font-black text-white">{kpi.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Left Col */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-400" /> Executive Summary</h3>
                  <p className="text-sm text-slate-400 leading-relaxed p-4 rounded-xl bg-slate-950/50 border border-white/5">
                    FlowPulse AI successfully managed urban traffic load through dynamic optimization of the signal grid. Automated interventions reduced systemic bottlenecks by preemptively addressing vehicle density anomalies on Broadway N-S. Emergency response pathways were activated and cleared within optimal safety margins.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Activity className="h-5 w-5 text-sky-400" /> Key Insights & Lessons Learned</h3>
                  <ul className="space-y-2">
                    {[
                      'Historical volume spikes on West Blvd require proactive green-phase extensions.',
                      'Emergency clearance times improved by 34% compared to baseline manually controlled sessions.',
                      'Weather coefficient adjustments successfully mitigated minor friction during simulated rain.'
                    ].map((lesson, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                        <span className="text-sky-500 font-bold">{idx + 1}.</span>
                        <span className="text-sm text-sky-200">{lesson}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Col */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-400" /> Critical Intervention Log</h3>
                <div className="space-y-3">
                  {events.filter(e => e.level === 'WARNING' || e.level === 'ERROR').slice(0, 5).map(evt => (
                    <div key={evt.id} className="p-3 rounded-xl bg-slate-950/50 border border-white/5 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{evt.message}</span>
                        <span className="text-[10px] font-mono text-slate-500">{evt.timestamp}</span>
                      </div>
                      {evt.aiReasoning && (
                        <p className="text-[10px] text-slate-400">AI: {evt.aiReasoning}</p>
                      )}
                    </div>
                  ))}
                  {events.length === 0 && <p className="text-sm text-slate-500">No critical events recorded.</p>}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const HeartbeatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);
