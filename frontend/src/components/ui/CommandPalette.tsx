/**
 * File: CommandPalette.tsx
 * Purpose: Global command menu modal.
 * Why it exists: Provides rapid jump commands and actions for control operators (triggered via Cmd/Ctrl + K).
 */

import React, { useState, useEffect, useRef } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useNotifications } from './Notifications';
import { useModal } from '../../context/ModalContext';
import { Search, Terminal, ArrowRight, Activity, Sliders, ShieldAlert, Award } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useJudgeMode } from '../../context/JudgeModeContext';

interface CommandPaletteProps {
  setActiveTab: (tab: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useNotifications();
  const { openModal } = useModal();
  const { startJudgeMode } = useJudgeMode();

  // Bind Ctrl+K shortcut
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrlKey: true,
      action: () => setIsOpen((prev) => !prev),
    },
    {
      key: 'k',
      metaKey: true,
      action: () => setIsOpen((prev) => !prev),
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const commands = [
    { id: 'go_dashboard', title: 'Go to Operator Desk', desc: 'Monitor active camera streams & signal clocks', category: 'Navigation', icon: <Terminal className="h-4 w-4" />, action: () => { setActiveTab('dashboard'); setIsOpen(false); } },
    { id: 'go_digital_twin', title: 'Go to City Digital Twin', desc: 'Interact with the smart city twin map canvas & node systems', category: 'Navigation', icon: <Award className="h-4 w-4 text-emerald-400" />, action: () => { setActiveTab('digital-twin'); setIsOpen(false); } },
    { id: 'go_analytics', title: 'Go to City Analytics', desc: 'View congestion ratios, counts & trends', category: 'Navigation', icon: <Activity className="h-4 w-4" />, action: () => { setActiveTab('analytics'); setIsOpen(false); } },
    { id: 'go_simulation', title: 'Go to Simulation Control', desc: 'Simulate emergency routing & load testing', category: 'Navigation', icon: <Sliders className="h-4 w-4" />, action: () => { setActiveTab('simulation'); setIsOpen(false); } },
    { id: 'go_health', title: 'Go to System Health', desc: 'View API latencies & thread pools status', category: 'Navigation', icon: <ShieldAlert className="h-4 w-4" />, action: () => { setActiveTab('health'); setIsOpen(false); } },
    { id: 'trigger_override', title: 'Trigger Preemption Override', desc: 'Force phase routing to East-West immediately', category: 'Actuation', icon: <Sliders className="h-4 w-4" />, action: () => {
        setIsOpen(false);
        openModal({
          title: 'Emergency Actuation Override',
          content: (
            <div className="space-y-3">
              <p>You are about to force-preempt phase timings at Junction Central (Broadway & 42nd St).</p>
              <div className="rounded-lg bg-rose-500/10 p-3 text-[11px] text-rose-400 border border-rose-500/20">
                WARNING: Forcing manual override disables AI adaptive routines until set back to AUTO.
              </div>
              <button
                onClick={() => addToast('Manual override signal broadcasted successfully!', 'success')}
                className="w-full rounded-lg bg-rose-600 hover:bg-rose-500 py-2 font-bold text-white transition-colors"
              >
                Confirm Preemption Actuation
              </button>
            </div>
          ),
        });
      }
    },
    { id: 'reset_auto', title: 'Restore AI Autopilot Mode', desc: 'Resume automated adaptive signal controllers', category: 'Actuation', icon: <Sliders className="h-4 w-4" />, action: () => { addToast('AI Autopilot mode restored.', 'info'); setIsOpen(false); } },
    { id: 'run_judge_mode', title: 'Run Judge Walkthrough (CodeStorm Demo)', desc: 'Orchestrate automatic story walkthrough for hackathon presentation', category: 'System', icon: <Award className="h-4 w-4 text-emerald-400" />, action: () => { startJudgeMode(); setIsOpen(false); } }
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Top Navbar Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-slate-900/40 text-[10px] text-slate-400 hover:bg-slate-900/80 hover:text-slate-200 transition-all font-mono"
      >
        <Search className="h-3.5 w-3.5 text-slate-500" />
        <span>Search commands...</span>
        <kbd className="rounded bg-slate-800 border border-white/5 px-1 py-0.5 text-[8px] font-sans">Ctrl K</kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-xl rounded-2xl border border-white/5 bg-slate-950 shadow-2xl backdrop-blur-2xl overflow-hidden"
            >
              {/* Search input header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a command or route to jump..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
                >
                  ESC
                </button>
              </div>

              {/* Items List */}
              <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
                {filtered.length > 0 ? (
                  filtered.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors group"
                    >
                      <div className="rounded-lg bg-slate-900 border border-white/5 p-1.5 text-slate-300 group-hover:bg-slate-800 transition-colors">
                        {cmd.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200">{cmd.title}</span>
                          <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded">
                            {cmd.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{cmd.desc}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No matching commands found.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
