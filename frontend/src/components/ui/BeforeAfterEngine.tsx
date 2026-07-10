import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { ArrowRight, Zap, CheckCircle2, X } from 'lucide-react';
import { playSynthesizedSound } from '../../lib/sound';

export const BeforeAfterEngine: React.FC = () => {
  const { optimizationReport, setOptimizationReport } = useDashboardStore();

  if (!optimizationReport?.visible) return null;

  const handleClose = () => {
    playSynthesizedSound('click');
    setOptimizationReport(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 50, rotateX: 10 }}
          animate={{ scale: 1, y: 0, rotateX: 0 }}
          exit={{ scale: 0.9, y: 50, rotateX: -10 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-4xl bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-[0_30px_100px_rgba(16,185,129,0.15)] overflow-hidden relative"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="p-8 flex justify-between items-center border-b border-white/5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  Optimization Complete <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </h2>
                <p className="text-sm font-semibold text-slate-400">{optimizationReport.title}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-8 grid grid-cols-3 gap-6 relative z-10">
            {optimizationReport.metrics.map((metric: any, i: number) => {
              const isPositive = metric.improvement > 0;
              const colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400';
              const sign = isPositive ? '+' : '';

              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  className="p-5 bg-slate-950/50 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center"
                >
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-4 flex items-center gap-1.5">
                    {metric.icon} {metric.label}
                  </span>
                  
                  <div className="flex items-center justify-center gap-4 w-full">
                    <div className="text-right flex-1">
                      <span className="text-sm font-bold text-slate-500 block">BEFORE</span>
                      <span className="text-xl font-mono text-slate-400 line-through decoration-rose-500/50">{metric.before}</span>
                    </div>
                    
                    <ArrowRight className="h-5 w-5 text-slate-600 shrink-0" />
                    
                    <div className="text-left flex-1">
                      <span className="text-sm font-bold text-emerald-500 block">AFTER</span>
                      <span className={`text-3xl font-black font-mono shadow-sm ${colorClass} drop-shadow-[0_0_8px_currentColor]`}>
                        {metric.after}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-4 px-3 py-1 rounded-full text-xs font-black ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {sign}{metric.improvement}% {isPositive ? 'IMPROVEMENT' : 'CHANGE'}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="p-6 bg-slate-950/50 text-center border-t border-white/5 relative z-10">
            <button onClick={handleClose} className="px-12 py-3 bg-white text-slate-950 font-black uppercase tracking-widest text-sm rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Continue Operations
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
