import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../hooks/useDashboardStore';

export interface JudgeStep {
  number: number;
  name: string;
  subtitle: string;
  description: string;
  durationMs: number;
  badgeColor: string;
}

export const JUDGE_STEPS: JudgeStep[] = [
  {
    number: 1,
    name: 'Baseline Operation',
    subtitle: 'Step 1/8 — Normal Traffic',
    description: 'The city breathes normally. Neural object tracking monitors vehicles across four quadrants at 30 FPS, maintaining a high baseline Traffic Health Score.',
    durationMs: 10000,
    badgeColor: 'border-emerald-500/25 text-emerald-400 bg-emerald-950/30'
  },
  {
    number: 2,
    name: 'Influx Detected',
    subtitle: 'Step 2/8 — Rush Hour Begins',
    description: 'Vehicle density sharply increases as rush hour initiates. The AI pipeline begins detecting early micro-queues forming on the main arterial roads.',
    durationMs: 10000,
    badgeColor: 'border-amber-500/25 text-amber-400 bg-amber-950/30'
  },
  {
    number: 3,
    name: 'Gridlock Imminent',
    subtitle: 'Step 3/8 — Congestion Spikes',
    description: 'Traffic loads exceed traditional signal capacity. North/South queues compound, wait times skyrocket, and the Traffic Health Score rapidly deteriorates.',
    durationMs: 10000,
    badgeColor: 'border-rose-500/25 text-rose-400 bg-rose-950/30 animate-pulse'
  },
  {
    number: 4,
    name: 'AI Intervention',
    subtitle: 'Step 4/8 — Congestion Analysis',
    description: 'The AI decision engine diagnoses the bottleneck root cause. A tactical recommendation is instantly generated to rebalance the intersection phasing.',
    durationMs: 10000,
    badgeColor: 'border-violet-500/25 text-violet-400 bg-violet-950/30'
  },
  {
    number: 5,
    name: 'Adaptive Rebalancing',
    subtitle: 'Step 5/8 — Signal Optimization',
    description: 'Dynamic phase timing is deployed. Extended green cycles are allocated to the congested bounds, immediately dissipating the built-up queues.',
    durationMs: 10000,
    badgeColor: 'border-emerald-500/25 text-emerald-400 bg-emerald-950/30'
  },
  {
    number: 6,
    name: 'Critical Incident',
    subtitle: 'Step 6/8 — Ambulance Approaching',
    description: 'Computer vision identifies an emergency vehicle entering the grid. Standard signal loops are immediately suspended to prioritize life-saving clearance.',
    durationMs: 10000,
    badgeColor: 'border-rose-500/25 text-rose-400 bg-rose-950/30 animate-pulse'
  },
  {
    number: 7,
    name: 'Priority Override',
    subtitle: 'Step 7/8 — Green Corridor Active',
    description: 'The AI asserts a localized Green Corridor. Cross-traffic is halted (Red), and the ambulance’s trajectory is cleared across all synchronized lights.',
    durationMs: 10000,
    badgeColor: 'border-sky-500/25 text-sky-400 bg-sky-950/30'
  },
  {
    number: 8,
    name: 'System Recovery',
    subtitle: 'Step 8/8 — Grid Normalization',
    description: 'The ambulance clears the junction. The system fluidly transitions back to auto-adaptive mode, clearing residual cross-traffic and restoring the Health Score.',
    durationMs: 10000,
    badgeColor: 'border-emerald-500/25 text-emerald-400 bg-emerald-950/30'
  }
];

interface JudgeModeContextType {
  isJudgeMode: boolean;
  currentStepIndex: number;
  isPlaying: boolean;
  steps: JudgeStep[];
  startJudgeMode: () => void;
  stopJudgeMode: () => void;
  setStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  togglePlay: () => void;
  showSummary: boolean;
  setShowSummary: (val: boolean) => void;
}

const JudgeModeContext = createContext<JudgeModeContextType | undefined>(undefined);

export const JudgeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isJudgeMode, setIsJudgeMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  const {
    setTrafficLoad,
    triggerEmergency,
    setSignalStatus,
    addEvent,
    clearEvents
  } = useDashboardStore();

  // Helper to dispatch custom events simulating WS payload updates
  const dispatchMockWS = (event: string, data: any) => {
    window.dispatchEvent(
      new CustomEvent('mock-ws-message', {
        detail: { event, timestamp: Date.now() / 1000, data }
      })
    );
  };

  const applyStepState = (index: number) => {
    const stepNum = index + 1;
    
    // Clear and add visual narrative events to timeline log
    if (stepNum === 1) {
      clearEvents();
    }
    
    addEvent('INFO', `Walkthrough Step ${stepNum}: ${JUDGE_STEPS[index].name}`, 'JUDGE_MODE');

    switch (stepNum) {
      case 1: // Normal traffic
        setTrafficLoad('light');
        triggerEmergency('none');
        setSignalStatus('NORTH_SOUTH', 22, 'AUTO', false);
        dispatchMockWS('metrics:update', {
          camera_id: 'cam_uploaded',
          congestion_score: 12.5,
          total_count: 4,
          emergency_detected: false,
          health_score: 92,
          fps: 15.0,
          processing_time_ms: 32,
          vehicle_classes: { car: 3, motorcycle: 1 },
          lane_utilization: { NORTH: 2, SOUTH: 1, EAST: 1, WEST: 0 },
          lanes: {
            NORTH: { queue_length: 1, avg_wait_sec: 4 },
            SOUTH: { queue_length: 1, avg_wait_sec: 5 },
            EAST: { queue_length: 1, avg_wait_sec: 6 },
            WEST: { queue_length: 0, avg_wait_sec: 0 }
          }
        });
        break;

      case 2: // Rush hour begins
        setTrafficLoad('normal');
        triggerEmergency('none');
        setSignalStatus('NORTH_SOUTH', 18, 'AUTO', false);
        dispatchMockWS('metrics:update', {
          camera_id: 'cam_uploaded',
          congestion_score: 45.0,
          total_count: 8,
          emergency_detected: false,
          health_score: 75,
          fps: 15.0,
          processing_time_ms: 34,
          vehicle_classes: { car: 6, truck: 1, bus: 1 },
          lane_utilization: { NORTH: 3, SOUTH: 2, EAST: 2, WEST: 1 },
          lanes: {
            NORTH: { queue_length: 3, avg_wait_sec: 12 },
            SOUTH: { queue_length: 2, avg_wait_sec: 15 },
            EAST: { queue_length: 2, avg_wait_sec: 10 },
            WEST: { queue_length: 1, avg_wait_sec: 8 }
          }
        });
        break;

      case 3: // Congestion increases / Health Score decreases
        setTrafficLoad('heavy');
        triggerEmergency('none');
        setSignalStatus('NORTH_SOUTH', 5, 'AUTO', false);
        dispatchMockWS('metrics:update', {
          camera_id: 'cam_uploaded',
          congestion_score: 82.0,
          total_count: 18,
          emergency_detected: false,
          health_score: 41,
          fps: 15.0,
          processing_time_ms: 36,
          vehicle_classes: { car: 12, truck: 4, bus: 2 },
          lane_utilization: { NORTH: 7, SOUTH: 5, EAST: 4, WEST: 2 },
          lanes: {
            NORTH: { queue_length: 7, avg_wait_sec: 48 },
            SOUTH: { queue_length: 5, avg_wait_sec: 42 },
            EAST: { queue_length: 4, avg_wait_sec: 38 },
            WEST: { queue_length: 2, avg_wait_sec: 20 }
          }
        });
        break;

      case 4: // AI detects congestion & explains why
        setTrafficLoad('heavy');
        dispatchMockWS('ai:recommendations', {
          recommendations: [
            {
              id: 'rec_heavy',
              title: 'Critical Congestion Detected',
              severity: 'RECOMMENDATION',
              confidence: 0.92,
              reason: 'Health score has dropped to 41/100. Density exceeds 82% threshold. Active vehicle count: 18.',
              improvement: 'Recommend maximum green extension on primary corridor. Estimated queue clearance: +45 seconds.',
              timestamp: Date.now() / 1000
            }
          ]
        });
        break;

      case 5: // Adaptive signal timing applied
        setSignalStatus('NORTH_SOUTH', 45, 'AUTO', false); // Extended green
        dispatchMockWS('metrics:update', {
          camera_id: 'cam_uploaded',
          congestion_score: 60.0,
          total_count: 12,
          emergency_detected: false,
          health_score: 65,
          fps: 15.0,
          processing_time_ms: 33,
          vehicle_classes: { car: 8, truck: 3, bus: 1 },
          lane_utilization: { NORTH: 4, SOUTH: 3, EAST: 3, WEST: 2 },
          lanes: {
            NORTH: { queue_length: 4, avg_wait_sec: 24 },
            SOUTH: { queue_length: 3, avg_wait_sec: 22 },
            EAST: { queue_length: 3, avg_wait_sec: 45 },
            WEST: { queue_length: 2, avg_wait_sec: 30 }
          }
        });
        break;

      case 6: // Ambulance enters
        triggerEmergency('ambulance');
        dispatchMockWS('metrics:update', {
          camera_id: 'cam_uploaded',
          congestion_score: 65.0,
          total_count: 13,
          emergency_detected: true,
          health_score: 61,
          fps: 15.0,
          processing_time_ms: 35,
          vehicle_classes: { car: 8, truck: 3, bus: 1, emergency: 1 },
          lane_utilization: { NORTH: 5, SOUTH: 3, EAST: 3, WEST: 2 },
          lanes: {
            NORTH: { queue_length: 5, avg_wait_sec: 28 },
            SOUTH: { queue_length: 3, avg_wait_sec: 22 },
            EAST: { queue_length: 3, avg_wait_sec: 45 },
            WEST: { queue_length: 2, avg_wait_sec: 30 }
          }
        });
        dispatchMockWS('alert:emergency', {
          camera_id: 'cam_uploaded',
          vehicle_type: 'ambulance',
          confidence: 0.98,
          action_taken: 'Recalculating corridor preemption sequences.'
        });
        break;

      case 7: // Green Corridor activates
        setSignalStatus('NORTH_SOUTH', 30, 'MANUAL', true);
        dispatchMockWS('ai:recommendations', {
          recommendations: [
            {
              id: 'rec_em',
              title: 'Emergency Priority Preemption (Gemini AI)',
              severity: 'ALERT',
              confidence: 0.99,
              reason: 'AMBULANCE detected approaching northbound lane. High localized congestion requires immediate preemptive routing.',
              improvement: 'AI Green Corridor activated. All cross-traffic halted. Estimated clearance time: 9 seconds.',
              timestamp: Date.now() / 1000
            }
          ]
        });
        break;

      case 8: // Ambulance clears / Health improves
        setTrafficLoad('normal');
        triggerEmergency('none');
        setSignalStatus('NORTH_SOUTH', 20, 'AUTO', false);
        dispatchMockWS('metrics:update', {
          camera_id: 'cam_uploaded',
          congestion_score: 15.0,
          total_count: 6,
          emergency_detected: false,
          health_score: 94,
          fps: 15.0,
          processing_time_ms: 30,
          vehicle_classes: { car: 5, truck: 1 },
          lane_utilization: { NORTH: 2, SOUTH: 2, EAST: 1, WEST: 1 },
          lanes: {
            NORTH: { queue_length: 1, avg_wait_sec: 8 },
            SOUTH: { queue_length: 2, avg_wait_sec: 12 },
            EAST: { queue_length: 1, avg_wait_sec: 6 },
            WEST: { queue_length: 1, avg_wait_sec: 5 }
          }
        });
        dispatchMockWS('ai:recommendations', {
          recommendations: [
            {
              id: 'rec_final',
              title: 'Grid Balance Optimal',
              severity: 'OPTIMAL',
              confidence: 0.97,
              reason: 'Emergency cleared. Adaptive flow re-engaged.',
              improvement: 'Estimated CO2 reduction: 22% this hour.',
              timestamp: Date.now() / 1000
            }
          ]
        });
        break;

      default:
        break;
    }
  };

  const startJudgeMode = () => {
    setIsJudgeMode(true);
    setShowSummary(false);
    setCurrentStepIndex(0);
    setIsPlaying(true);
    applyStepState(0);
  };

  const stopJudgeMode = () => {
    setIsJudgeMode(false);
    setShowSummary(false);
    setIsPlaying(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Restore default simulator setting
    setTrafficLoad('normal');
    triggerEmergency('none');
  };

  const setStep = (index: number) => {
    if (index >= 0 && index < JUDGE_STEPS.length) {
      setCurrentStepIndex(index);
      applyStepState(index);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < JUDGE_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      applyStepState(nextIndex);
    } else {
      // Reached the end, trigger summary
      setIsPlaying(false);
      setShowSummary(true);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      applyStepState(prevIndex);
    }
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  // Playback timer handling
  useEffect(() => {
    if (isJudgeMode && isPlaying) {
      const currentStep = JUDGE_STEPS[currentStepIndex];
      timerRef.current = window.setTimeout(() => {
        nextStep();
      }, currentStep.durationMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isJudgeMode, isPlaying, currentStepIndex]);

  return (
    <JudgeModeContext.Provider
      value={{
        isJudgeMode,
        currentStepIndex,
        isPlaying,
        steps: JUDGE_STEPS,
        startJudgeMode,
        stopJudgeMode,
        setStep,
        nextStep,
        prevStep,
        togglePlay,
        showSummary,
        setShowSummary
      }}
    >
      {children}
    </JudgeModeContext.Provider>
  );
};

export const useJudgeMode = () => {
  const context = useContext(JudgeModeContext);
  if (!context) {
    throw new Error('useJudgeMode must be used within a JudgeModeProvider');
  }
  return context;
};
