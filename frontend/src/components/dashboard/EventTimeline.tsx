import React from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { ClipboardList, Trash2, ShieldAlert, Cpu, Activity, User, Network, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const EventTimeline: React.FC = () => {
  const { events, clearEvents } = useDashboardStore();

  return (
    <Card variant="glass" className="space-y-4 flex flex-col justify-between h-[500px]">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Mission Timeline</h4>
        </div>
        <button
          onClick={clearEvents}
          className="text-slate-500 hover:text-slate-300 p-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
          title="Clear Event Log"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <AnimatePresence initial={false}>
          {events.length > 0 ? (
            events.map((evt, idx) => {
              let indicatorColor = 'bg-emerald-400 border-emerald-500/20 text-emerald-300';
              let icon = <Activity className="h-3 w-3" />;

              if (evt.level === 'ERROR') {
                indicatorColor = 'bg-rose-500 border-rose-500/20 text-rose-300 bg-rose-950/20';
                icon = <ShieldAlert className="h-3 w-3" />;
              } else if (evt.level === 'WARNING') {
                indicatorColor = 'bg-amber-500 border-amber-500/20 text-amber-300 bg-amber-950/20';
                icon = <Activity className="h-3 w-3" />;
              }

              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25, delay: idx * 0.05 }}
                  className={`relative p-3 rounded-xl border ${indicatorColor.split(' ')[1]} ${indicatorColor.split(' ')[3] || 'bg-slate-900/50'} backdrop-blur-md`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg border ${indicatorColor.split(' ')[1]} ${indicatorColor.split(' ')[2]}`}>
                      {icon}
                    </div>
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[11px] font-bold leading-tight ${indicatorColor.split(' ')[2]}`}>
                          {evt.message}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono flex-shrink-0 mt-0.5 border border-white/5 px-1.5 py-0.5 rounded">
                          {evt.timestamp}
                        </span>
                      </div>

                      {/* AI Reasoning */}
                      {evt.aiReasoning && (
                        <div className="flex items-start gap-2 mt-2 bg-slate-950/40 p-2 rounded border border-white/5">
                          <Cpu className="h-3 w-3 text-sky-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-500 block">AI Reasoning</span>
                            <span className="text-[10px] text-slate-300 font-medium">{evt.aiReasoning}</span>
                          </div>
                        </div>
                      )}

                      {/* Operator Action & Result */}
                      {(evt.operatorAction || evt.result) && (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {evt.operatorAction && (
                            <div className="flex items-start gap-1.5 p-1.5 rounded bg-emerald-500/5 border border-emerald-500/10">
                              <User className="h-3 w-3 text-emerald-500 shrink-0" />
                              <div>
                                <span className="text-[7px] font-black uppercase text-emerald-600 block">Action</span>
                                <span className="text-[9px] text-emerald-400">{evt.operatorAction}</span>
                              </div>
                            </div>
                          )}
                          {evt.result && (
                            <div className="flex items-start gap-1.5 p-1.5 rounded bg-sky-500/5 border border-sky-500/10">
                              <Activity className="h-3 w-3 text-sky-500 shrink-0" />
                              <div>
                                <span className="text-[7px] font-black uppercase text-sky-600 block">Result</span>
                                <span className="text-[9px] text-sky-400">{evt.result}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Affected Zones */}
                      {(evt.affectedRoads || evt.affectedIntersections) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {evt.affectedRoads?.map(road => (
                            <span key={road} className="flex items-center gap-1 text-[8px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
                              <Network className="h-2 w-2" /> {road}
                            </span>
                          ))}
                          {evt.affectedIntersections?.map(int => (
                            <span key={int} className="flex items-center gap-1 text-[8px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
                              <MapPin className="h-2 w-2" /> {int}
                            </span>
                          ))}
                        </div>
                      )}

                      <span className="text-[7px] text-slate-600 uppercase tracking-widest font-mono font-bold mt-2 block">
                        Source: {evt.source}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center text-slate-550 text-[10px]"
            >
              No mission events recorded.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default EventTimeline;
