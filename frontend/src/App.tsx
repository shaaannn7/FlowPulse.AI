/**
 * File: App.tsx
 * Purpose: Main application router entry point.
 * Why it exists: Combines lazy-loaded layout pages, React Router paths, and fallback loaders.
 */

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AppProviders from './lib/providers';
import AppShell from './layouts/AppShell';
import { Zap } from 'lucide-react';

// Lazy loading route components
const Landing = React.lazy(() => import('./pages/Landing'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Simulation = React.lazy(() => import('./pages/Simulation'));
const SystemHealth = React.lazy(() => import('./pages/SystemHealth'));
const Logs = React.lazy(() => import('./pages/Logs'));
const Settings = React.lazy(() => import('./pages/Settings'));
const DigitalTwin = React.lazy(() => import('./pages/DigitalTwin'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Premium fullscreen loading screen fallback
const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#090A0F] text-slate-100 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="rounded-xl bg-emerald-500/10 p-2 border border-emerald-500/20 text-emerald-400">
          <Zap className="h-6 w-6" />
        </div>
        <h4 className="text-xs font-bold tracking-widest text-slate-300 uppercase">Loading Console...</h4>
      </div>
    </div>
  );
};

// Layout shell routing wrapper
const ShellWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppShell>
      <Suspense fallback={<LoadingScreen />}>
        {children}
      </Suspense>
    </AppShell>
  );
};

// Root Router mapping
function AppRoutes() {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Landing onLogin={() => navigate('/dashboard')} />} />
        <Route path="/dashboard" element={<ShellWrapper><Dashboard /></ShellWrapper>} />
        <Route path="/digital-twin" element={<ShellWrapper><DigitalTwin /></ShellWrapper>} />
        <Route path="/analytics" element={<ShellWrapper><Analytics /></ShellWrapper>} />
        <Route path="/simulation" element={<ShellWrapper><Simulation /></ShellWrapper>} />
        <Route path="/health" element={<ShellWrapper><SystemHealth /></ShellWrapper>} />
        <Route path="/logs" element={<ShellWrapper><Logs /></ShellWrapper>} />
        <Route path="/settings" element={<ShellWrapper><Settings /></ShellWrapper>} />
        <Route path="/404" element={<NotFound onBack={() => navigate('/dashboard')} />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
