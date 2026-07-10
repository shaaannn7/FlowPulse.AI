/**
 * File: Dashboard.tsx
 * Purpose: Central Traffic Operations Cockpit — primary operator view.
 * Why it exists: Orchestrates the live AI video player, video uploader, real-time
 *                metrics panels, signal controller, simulation controls, AI recommendations,
 *                and event timeline into a production-grade operator dashboard.
 */

import React, { useEffect } from 'react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Card } from '../components/ui/Card';
import { useDashboardStore } from '../hooks/useDashboardStore';
import { VideoPlayer } from '../components/dashboard/VideoPlayer';
import { VideoUploader } from '../components/dashboard/VideoUploader';
import { LiveMetricsPanel } from '../components/dashboard/LiveMetricsPanel';
import { AIRecommendationsLive } from '../components/dashboard/AIRecommendationsLive';
import { VehicleAnalytics } from '../components/dashboard/VehicleAnalytics';
import { SignalControlPanel } from '../components/dashboard/SignalControlPanel';
import { SimulationControlPanel } from '../components/dashboard/SimulationControlPanel';
import { EmergencyResponseCenter } from '../components/dashboard/EmergencyResponseCenter';
import { TrafficPredictionPanel } from '../components/dashboard/TrafficPredictionPanel';
import { EventTimeline } from '../components/dashboard/EventTimeline';
import { DeveloperPanel } from '../components/dashboard/DeveloperPanel';
import { TrafficHealthScore } from '../components/dashboard/TrafficHealthScore';
import { InteractiveCityMap } from '../components/dashboard/InteractiveCityMap';
import { MissionControlPanel } from '../components/dashboard/MissionControlPanel';
import { SessionReportModal } from '../components/ui/SessionReportModal';

export const Dashboard: React.FC = () => {
  const { tickSignal, hackathonMode } = useDashboardStore();

  // Tick local signal simulation once per second
  useEffect(() => {
    const timer = setInterval(() => tickSignal(), 1000);
    return () => clearInterval(timer);
  }, [tickSignal]);

  if (hackathonMode) {
    return (
      <div className="space-y-6 pb-20">
        <SessionReportModal />
        
        <div className="flex justify-between items-center mb-4">
          <Breadcrumbs paths={['Monitor Workspace', 'Mission Control']} />
          <span className="flex items-center gap-1.5 text-[9px] font-extrabold text-sky-400 bg-sky-950/40 border border-sky-500/15 px-3 py-1 rounded-full animate-pulse uppercase tracking-wider shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            Mission Control Active [Press Cmd+K]
          </span>
        </div>

        <MissionControlPanel />
        
        <div className="grid grid-cols-12 gap-6">
          {/* Main Map & Timeline */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <InteractiveCityMap />
            <EventTimeline />
          </div>

          {/* Intel & Analytics */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <TrafficHealthScore />
            <Card variant="glass" className="p-5 flex-1 max-h-[400px]">
              <AIRecommendationsLive />
            </Card>
            <EmergencyResponseCenter />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <Breadcrumbs paths={['Monitor Workspace', 'Operator Cockpit']} />
        <span className="flex items-center gap-1.5 text-[9px] font-extrabold text-emerald-400 bg-emerald-950/40 border border-emerald-500/15 px-3 py-1 rounded-full animate-pulse uppercase tracking-wider">
          ATSC Control Loop Active (Press Cmd+K for Palette)
        </span>
      </div>

      {/* ── Row 1: Main AI Video + Upload + Live Metrics ────────────── */}
      <div className="grid grid-cols-3 gap-6">
        {/* Live AI video stream — largest panel */}
        <div className="col-span-2">
          <VideoPlayer />
        </div>

        {/* Right column: upload + live metrics */}
        <div className="col-span-1 flex flex-col gap-5">
          <Card variant="glass" className="p-5">
            <VideoUploader />
          </Card>
          <Card variant="glass" className="p-5 flex-1 overflow-hidden">
            <LiveMetricsPanel />
          </Card>
        </div>
      </div>

      {/* ── Row 2: Vehicle classifications ──────────────────────────── */}
      <VehicleAnalytics />

      {/* ── Row 3: Signal + AI Recommendations + Health + Emergency ─── */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Signal panel + Simulation */}
        <div className="col-span-1 space-y-6">
          <SignalControlPanel />
          <TrafficHealthScore />
          <EmergencyResponseCenter />
        </div>

        {/* Centre: Live AI recommendations */}
        <div className="col-span-1">
          <Card variant="glass" className="p-5 h-full">
            <AIRecommendationsLive />
          </Card>
        </div>

        {/* Right: Simulation + map + developer controls */}
        <div className="col-span-1 space-y-6">
          <InteractiveCityMap />
          <SimulationControlPanel />
          <DeveloperPanel />
        </div>
      </div>

      {/* ── Row 4: Prediction graph + Event timeline ─────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        <TrafficPredictionPanel />
        <EventTimeline />
      </div>
    </div>
  );
};

export default Dashboard;
