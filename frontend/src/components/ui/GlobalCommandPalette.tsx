import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Map, Activity, ShieldAlert, BarChart3, Settings, PlayCircle, FileText } from 'lucide-react';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { playSynthesizedSound } from '../../lib/sound';

export const GlobalCommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { toggleHackathonMode, triggerEmergency, setMissionState, clearEvents } = useDashboardStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) playSynthesizedSound('click');
          return !prev;
        });
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = [
    { id: '1', label: 'Analyze City Traffic', icon: <Activity className="h-4 w-4" />, action: () => setMissionState('SCANNING') },
    { id: '2', label: 'Generate Executive Session Report', icon: <FileText className="h-4 w-4" />, action: () => setMissionState('COMPLETE') },
    { id: '3', label: 'Predict Congestion Impact', icon: <BarChart3 className="h-4 w-4" />, action: () => setMissionState('THREAT_ASSESSMENT') },
    { id: '4', label: 'Trigger Emergency Mode (Ambulance)', icon: <ShieldAlert className="h-4 w-4 text-rose-400" />, action: () => triggerEmergency('ambulance') },
    { id: '5', label: 'Optimize Grid Signals', icon: <Settings className="h-4 w-4" />, action: () => setMissionState('OPTIMIZING') },
    { id: '6', label: 'Replay Last Mission', icon: <PlayCircle className="h-4 w-4" />, action: () => clearEvents() },
    { id: '7', label: 'Toggle Mission Control (Hackathon Mode)', icon: <Map className="h-4 w-4 text-emerald-400" />, action: () => toggleHackathonMode() },
  ];

  const filteredCommands = commands.filter(cmd => cmd.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (action: () => void) => {
    playSynthesizedSound('alert');
    action();
    setIsOpen(false);
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm"
          />
          
          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 z-[101] w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="flex items-center px-4 py-4 border-b border-white/5">
              <Search className="h-5 w-5 text-slate-400 mr-3" />
              <input
                autoFocus
                type="text"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 placeholder-slate-500 font-medium"
              />
              <span className="text-[10px] text-slate-500 border border-white/10 px-1.5 py-0.5 rounded ml-3">ESC</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd.action)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-xl hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-300 transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                      {cmd.icon}
                    </div>
                    <span className="font-semibold">{cmd.label}</span>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">
                  No commands found for "{query}"
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
