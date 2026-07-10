import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { LayoutDashboard, BarChart3, Settings, ClipboardList, Zap } from 'lucide-react';


interface DashboardLayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activePage, setActivePage }) => {
  const { isConnected } = useWebSocket();

  const navItems = [
    { id: 'dashboard', label: 'Operator Desk', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'analytics', label: 'City Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'logs', label: 'System Logs', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'settings', label: 'Optimizer Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090A0F] text-slate-100 font-sans">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[600px] h-[600px] rounded-full bg-emerald-950/10 blur-[150px] pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className="relative flex flex-col w-64 border-r border-white/5 bg-slate-950/45 backdrop-blur-2xl">
        <div className="flex items-center gap-2 px-6 py-6 border-b border-white/5">
          <div className="rounded-lg bg-emerald-500/10 p-1.5 border border-emerald-500/20">
            <Zap className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100">FlowPulse AI</h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Smart Cities</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-white/10 text-white border-l-2 border-emerald-400 shadow-lg shadow-black/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-white/5 text-[10px] text-slate-500 font-mono">
          <span>v1.0.0 (Hackathon MVP)</span>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="relative flex items-center justify-between px-8 py-5 border-b border-white/5 bg-slate-950/20 backdrop-blur-md">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-slate-100">Junction Central Controller</h2>
            <p className="text-xs text-slate-400 font-medium">Broadway & 42nd St (Monitored Intersection)</p>
          </div>

          <div className="flex items-center gap-4">
            {/* WS Connectivity Badge */}
            <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs">
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-mono text-[10px] text-slate-300">
                {isConnected ? 'STREAMING ACTIVE' : 'STREAM DISCONNECTED'}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
