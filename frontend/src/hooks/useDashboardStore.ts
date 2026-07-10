/**
 * File: useDashboardStore.ts
 * Purpose: Central state store for UI components.
 * Why it exists: Orchestrates dev debug settings, mock simulation modifiers, notification logs, and synchronization targets without backend binds.
 */

import { create } from 'zustand';
import type { SignalPhase } from '../../../shared/types';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  source: string;
  aiReasoning?: string;
  operatorAction?: string;
  result?: string;
  affectedRoads?: string[];
  affectedIntersections?: string[];
}

export interface DevSettings {
  showBoundingBoxes: boolean;
  showLaneLines: boolean;
  showDetectionLabels: boolean;
  showFps: boolean;
  isDebugMode: boolean;
  showPerformanceMetrics: boolean;
}

export interface SimulationState {
  activeEmergency: 'none' | 'ambulance' | 'fire_truck' | 'police';
  trafficLoad: 'light' | 'normal' | 'heavy';
  weather: 'clear' | 'rain' | 'fog';
  signalFailure: boolean;
}

interface DashboardStore {
  // Developer Controls
  devSettings: DevSettings;
  toggleDevSetting: (setting: keyof DevSettings) => void;
  
  // Simulation Controls
  simState: SimulationState;
  triggerEmergency: (type: SimulationState['activeEmergency']) => void;
  setTrafficLoad: (load: SimulationState['trafficLoad']) => void;
  setWeather: (weather: SimulationState['weather']) => void;
  toggleSignalFailure: () => void;
  resetSimulation: () => void;

  // Active Signal Status (Simulated / Local sync)
  activePhase: SignalPhase;
  secondsRemaining: number;
  mode: 'AUTO' | 'MANUAL';
  emergencyActive: boolean;
  setSignalStatus: (phase: SignalPhase, sec: number, mode: 'AUTO' | 'MANUAL', emergency: boolean) => void;
  tickSignal: () => void;

  // Event Timeline Log
  events: TimelineEvent[];
  addEvent: (evtOrLevel: Omit<TimelineEvent, 'id' | 'timestamp'> | 'INFO' | 'WARNING' | 'ERROR', message?: string, source?: string) => void;
  clearEvents: () => void;

  // Selected Digital Twin Junction
  selectedJunction: string;
  setSelectedJunction: (name: string) => void;

  // Mission Control & Hackathon Mode
  hackathonMode: boolean;
  toggleHackathonMode: () => void;
  missionState: 'IDLE' | 'SCANNING' | 'THREAT_ASSESSMENT' | 'OPTIMIZING' | 'MONITORING' | 'COMPLETE';
  setMissionState: (state: 'IDLE' | 'SCANNING' | 'THREAT_ASSESSMENT' | 'OPTIMIZING' | 'MONITORING' | 'COMPLETE') => void;

  // Before/After Engine
  optimizationReport: { visible: boolean; title: string; metrics: any } | null;
  setOptimizationReport: (report: any) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Dev Settings defaults
  devSettings: {
    showBoundingBoxes: true,
    showLaneLines: true,
    showDetectionLabels: true,
    showFps: true,
    isDebugMode: false,
    showPerformanceMetrics: false,
  },
  toggleDevSetting: (setting) =>
    set((state) => ({
      devSettings: { ...state.devSettings, [setting]: !state.devSettings[setting] },
    })),

  // Simulation parameters defaults
  simState: {
    activeEmergency: 'none',
    trafficLoad: 'normal',
    weather: 'clear',
    signalFailure: false,
  },
  triggerEmergency: (type) => {
    set((state) => {
      const isEmergency = type !== 'none';
      const msg = isEmergency 
        ? `Simulated emergency ${type.toUpperCase()} approaching northbound. Priority override active.` 
        : 'Emergency vehicle cleared. Restoring traffic loop flow.';
      
      // Add event to log
      const eventId = Math.random().toString();
      const newEvent: TimelineEvent = {
        id: eventId,
        timestamp: new Date().toLocaleTimeString(),
        level: isEmergency ? 'WARNING' : 'INFO',
        message: msg,
        source: 'SIMULATOR',
      };

      return {
        simState: { ...state.simState, activeEmergency: type },
        emergencyActive: isEmergency,
        activePhase: isEmergency ? 'NORTH_SOUTH' : state.activePhase,
        secondsRemaining: isEmergency ? 30 : 20,
        events: [newEvent, ...state.events].slice(0, 100),
      };
    });
  },
  setTrafficLoad: (load) =>
    set((state) => {
      const event: TimelineEvent = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: load === 'heavy' ? 'WARNING' : 'INFO',
        message: `Traffic load coefficient updated to ${load.toUpperCase()}`,
        source: 'SIMULATOR',
      };
      return {
        simState: { ...state.simState, trafficLoad: load },
        events: [event, ...state.events].slice(0, 100),
      };
    }),
  setWeather: (weather) =>
    set((state) => {
      const event: TimelineEvent = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: weather === 'clear' ? 'INFO' : 'WARNING',
        message: `Environmental modifier: weather changed to ${weather.toUpperCase()}`,
        source: 'SIMULATOR',
      };
      return {
        simState: { ...state.simState, weather },
        events: [event, ...state.events].slice(0, 100),
      };
    }),
  toggleSignalFailure: () =>
    set((state) => {
      const nextFail = !state.simState.signalFailure;
      const event: TimelineEvent = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: nextFail ? 'ERROR' : 'INFO',
        message: nextFail ? 'CRITICAL: Simulated grid signal loop controller FAILURE!' : 'Signal loop controller restored successfully.',
        source: 'SIMULATOR',
      };
      return {
        simState: { ...state.simState, signalFailure: nextFail },
        events: [event, ...state.events].slice(0, 100),
      };
    }),
  resetSimulation: () =>
    set((state) => {
      const event: TimelineEvent = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: 'INFO',
        message: 'Simulation descriptors reset to factory defaults.',
        source: 'SIMULATOR',
      };
      return {
        simState: {
          activeEmergency: 'none',
          trafficLoad: 'normal',
          weather: 'clear',
          signalFailure: false,
        },
        emergencyActive: false,
        activePhase: 'NORTH_SOUTH',
        secondsRemaining: 30,
        mode: 'AUTO',
        events: [event, ...state.events].slice(0, 100),
      };
    }),

  // Signal properties
  activePhase: 'NORTH_SOUTH',
  secondsRemaining: 30,
  mode: 'AUTO',
  emergencyActive: false,
  
  setSignalStatus: (phase, sec, mode, emergency) =>
    set({ activePhase: phase, secondsRemaining: sec, mode, emergencyActive: emergency }),
    
  tickSignal: () =>
    set((state) => {
      if (state.simState.signalFailure) {
        // Red flashing state in case of failure
        return { secondsRemaining: 0 };
      }
      
      // In MANUAL or EMERGENCY override, don't tick down below 1s unless overridden
      if (state.emergencyActive) {
        return { secondsRemaining: Math.max(1, state.secondsRemaining - 1) };
      }
      
      if (state.secondsRemaining > 1) {
        return { secondsRemaining: state.secondsRemaining - 1 };
      } else {
        // Toggle phase
        const nextPhase = state.activePhase === 'NORTH_SOUTH' ? 'EAST_WEST' : 'NORTH_SOUTH';
        const nextSec = nextPhase === 'NORTH_SOUTH' ? 30 : 20;
        
        const event: TimelineEvent = {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          level: 'INFO',
          message: `Signal phase auto-cycled: ${state.activePhase} -> ${nextPhase}`,
          source: 'CONTROLLER',
        };
        
        return {
          activePhase: nextPhase,
          secondsRemaining: nextSec,
          events: [event, ...state.events].slice(0, 100),
        };
      }
    }),

  // Events list
  events: [
    {
      id: 'init-event',
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'Adaptive traffic signal control gateway initial handshake successful.',
      source: 'GATEWAY',
    },
  ],
  addEvent: (evtOrLevel, message, source) =>
    set((state) => {
      let eventPayload: Omit<TimelineEvent, 'id' | 'timestamp'>;
      if (typeof evtOrLevel === 'string') {
        eventPayload = {
          level: evtOrLevel as 'INFO' | 'WARNING' | 'ERROR',
          message: message || '',
          source: source || 'SYSTEM'
        };
      } else {
        eventPayload = evtOrLevel;
      }
      
      const newEvent: TimelineEvent = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        ...eventPayload
      };
      return { events: [newEvent, ...state.events].slice(0, 100) };
    }),
  clearEvents: () => set({ events: [] }),
  selectedJunction: 'Junction Central',
  setSelectedJunction: (name) => set({ selectedJunction: name }),
  hackathonMode: false,
  toggleHackathonMode: () => set((state) => ({ hackathonMode: !state.hackathonMode })),
  missionState: 'IDLE',
  setMissionState: (mState) => set({ missionState: mState }),
  optimizationReport: null,
  setOptimizationReport: (report) => set({ optimizationReport: report })
}));
