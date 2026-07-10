/**
 * File: AppShell.tsx
 * Purpose: Reusable application grid wrapper and sidebar container.
 * Why it exists: Enforces dark-theme styling, responsive spacing margins, and handles sidebar menus.
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Settings, ClipboardList, Zap, Moon, Sun, Activity, Sliders, Wifi, Volume2, VolumeX, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobalCommandPalette } from '../components/ui/GlobalCommandPalette';
import { CommandPalette } from '../components/ui/CommandPalette';
import { JudgeModeHUD } from '../components/ui/JudgeModeHUD';
import { AIIncidentCenter } from '../components/dashboard/AIIncidentCenter';
import { BeforeAfterEngine } from '../components/ui/BeforeAfterEngine';
import { useWebSocket } from '../context/WebSocketContext';
import { getMuted, setMuted, playSynthesizedSound } from '../lib/sound';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, lastFrame } = useWebSocket();
  const [time, setTime] = useState(new Date());
  const [ping, setPing] = useState(12);
  const [uptimeSec, setUptimeSec] = useState(3600); // Mock 1 hour initial uptime
  const [isMuted, setIsMutedState] = useState(getMuted());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2;
    const clickY = rect.top + rect.height / 2;

    playSynthesizedSound('click');
    
    if (prefersReducedMotion || !document.startViewTransition) {
      toggleTheme();
      return;
    }

    // Pass click coordinates to CSS
    document.documentElement.style.setProperty('--tx', `${clickX}px`);
    document.documentElement.style.setProperty('--ty', `${clickY}px`);

    document.startViewTransition(() => {
      // Synchronously flush the theme change to the DOM
      toggleTheme();
    });
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setMuted(nextMute);
    setIsMutedState(nextMute);
    if (!nextMute) {
      playSynthesizedSound('click');
    }
  };

  useEffect(() => {
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      setTime(new Date());
      setUptimeSec((u) => u + 1);
      // Update ping every 3 ticks (~3s) to avoid excess re-renders
      if (tick % 3 === 0) setPing(Math.floor(Math.random() * 6) + 8);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const menuItems = [
    { id: 'dashboard', label: 'Operator Desk', path: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'digital-twin', label: 'City Digital Twin', path: '/digital-twin', icon: <Map className="h-4 w-4" /> },
    { id: 'analytics', label: 'City Analytics', path: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'simulation', label: 'Simulation Panel', path: '/simulation', icon: <Sliders className="h-4 w-4" /> },
    { id: 'health', label: 'System Health', path: '/health', icon: <Activity className="h-4 w-4" /> },
    { id: 'logs', label: 'System Logs', path: '/logs', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'settings', label: 'Optimizer Settings', path: '/settings', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans ${
      theme === 'dark' ? 'bg-[#090A0F] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Background Ambient Glows */}
      <div className={`absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${
        theme === 'dark' ? 'bg-violet-500/10' : 'bg-indigo-500/5'
      }`} />
      
      {/* Sidebar Navigation */}
      <aside className={`relative flex flex-col w-64 border-r backdrop-blur-md ${
        theme === 'dark' ? 'border-white/5 bg-slate-950/60' : 'border-slate-200 bg-white/80'
      }`}>
        <div className={`flex items-center gap-2 px-6 py-6 border-b ${
          theme === 'dark' ? 'border-white/5' : 'border-slate-200'
        }`}>
          <div className="rounded-lg bg-emerald-500/10 p-1.5 border border-emerald-500/20">
            <Zap className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">FlowPulse AI</h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Smart Cities</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400 shadow-md shadow-black/10'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Theme and Version Controls */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          theme === 'dark' ? 'border-white/5' : 'border-slate-200'
        }`}>
          <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
          
          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleMute}
              className={`rounded-lg p-1.5 border transition-colors sound-toggle-btn ${
                theme === 'dark'
                  ? 'border-white/10 hover:bg-white/5 text-slate-400 hover:text-slate-200'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
              title={isMuted ? 'Unmute system alerts' : 'Mute system alerts'}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>

            {/* Premium Theme Toggle Button */}
            <motion.button
              onClick={handleThemeToggle}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className={`rounded-lg p-1.5 border shadow-sm relative overflow-hidden flex items-center justify-center cursor-pointer ${
                theme === 'dark'
                  ? 'border-white/10 bg-slate-900 text-amber-400 hover:bg-slate-800 hover:border-amber-500/20'
                  : 'border-slate-200 bg-white text-indigo-650 text-indigo-600 hover:bg-slate-50 hover:border-indigo-500/20'
              }`}
            >
              <div className="relative h-3.5 w-3.5 overflow-hidden flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={theme}
                    initial={{ y: 15, rotate: -45, opacity: 0 }}
                    animate={{ y: 0, rotate: 0, opacity: 1 }}
                    exit={{ y: -15, rotate: 45, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="absolute flex items-center justify-center"
                  >
                    {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.button>
          </div>
        </div>
      </aside>

      {/* Main Panel Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Panel */}
        <header className={`relative z-30 flex items-center justify-between px-8 py-5 border-b ${
          theme === 'dark' ? 'border-white/5 bg-slate-950/20' : 'border-slate-200 bg-white/40'
        } backdrop-blur-md`}>
          <div className="flex flex-col">
            <h2 className="text-base font-bold">Junction Central Controller</h2>
            <p className="text-xs text-slate-400 font-medium">Broadway & 42nd St (Monitored Intersection)</p>
          </div>

          {/* Real-time telemetry banner */}
          <div className="hidden lg:flex items-center gap-6 bg-slate-950/60 border border-white/5 rounded-2xl px-5 py-2.5 shadow-inner">
            {/* Clock */}
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest font-mono">Current Time</span>
              <span className="text-xs font-black text-slate-200 font-mono mt-0.5">
                {time.toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>

            <div className="h-6 w-px bg-white/5" />

            {/* Uptime */}
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest font-mono">Sys Uptime</span>
              <span className="text-xs font-black text-slate-200 font-mono mt-0.5">
                {formatUptime(uptimeSec)}
              </span>
            </div>

            <div className="h-6 w-px bg-white/5" />

            {/* Latency / Ping */}
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest font-mono">Gateway Ping</span>
              <span className="text-xs font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                <Wifi className="h-3 w-3 text-emerald-450" />
                <span>{ping} ms</span>
              </span>
            </div>

            <div className="h-6 w-px bg-white/5" />

            {/* FPS Heartbeat */}
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest font-mono">Stream Quality</span>
              <span className="text-xs font-black text-sky-400 font-mono mt-0.5 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
                <span>{(lastFrame?.fps ?? 15.0).toFixed(1)} FPS</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CommandPalette setActiveTab={(tab) => {
              const match = menuItems.find(m => m.id === tab);
              if (match) navigate(match.path);
            }} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          {children}
        </main>
        <JudgeModeHUD />
        <AIIncidentCenter />
        <GlobalCommandPalette />
        <BeforeAfterEngine />
      </div>
    </div>
  );
};
export default AppShell;
