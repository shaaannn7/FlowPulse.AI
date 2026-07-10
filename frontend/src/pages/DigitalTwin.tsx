import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { useDashboardStore } from '../hooks/useDashboardStore';
import { useWebSocket } from '../context/WebSocketContext';
import { useTheme } from '../hooks/useTheme';
import { playSynthesizedSound } from '../lib/sound';
import {
  MapPin,
  Navigation,
  Layers,
  Clock
} from 'lucide-react';

interface IntersectionData {
  name: string;
  x: number;
  y: number;
  health: number;
  count: number;
  congestion: number; // 0-100
  phase: 'NORTH_SOUTH' | 'EAST_WEST';
  seconds: number;
  emergency: boolean;
  rec: string;
  mode: 'AUTO' | 'MANUAL' | 'ADAPTIVE';
}

interface SimulatedVehicle {
  id: number;
  type: 'car' | 'truck' | 'bus' | 'motorcycle' | 'ambulance';
  x: number;
  y: number;
  speed: number;
  maxSpeed: number;
  routeIndex: number;
  segmentIndex: number;
  progress: number; // 0 to 1 along current segment
  color: string;
  isSelected: boolean;
  waitingTime?: number;
}

export const DigitalTwin: React.FC = () => {
  const { theme } = useTheme();
  const activePhase = useDashboardStore(state => state.activePhase);
  const secondsRemaining = useDashboardStore(state => state.secondsRemaining);
  const selectedJunction = useDashboardStore(state => state.selectedJunction);
  const setSelectedJunction = useDashboardStore(state => state.setSelectedJunction);
  const addEvent = useDashboardStore(state => state.addEvent);
  const activeEmergency = useDashboardStore(state => state.simState.activeEmergency);
  const weather = useDashboardStore(state => state.simState.weather);
  const { lastMetrics } = useWebSocket();

  // ─── Map Viewport Zoom / Pan ───
  const [transform, setTransform] = useState({ x: 50, y: 30, scale: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ─── Toggles & Selectors ───
  const [heatmapMode, setHeatmapMode] = useState<boolean>(true);
  const [selectedVehicle, setSelectedVehicle] = useState<SimulatedVehicle | null>(null);
  const [scenario, setScenario] = useState<'normal' | 'rush_hour' | 'rain' | 'fog' | 'accident' | 'closure' | 'construction' | 'vip' | 'ambulance' | 'fire_truck'>('normal');
  const activeIncident = scenario === 'accident' ? 'accident' : scenario === 'closure' ? 'closure' : 'none';
  const isEmergencyActive = scenario === 'ambulance' || scenario === 'fire_truck' || scenario === 'vip';
  const [hoveredIntersection, setHoveredIntersection] = useState<string | null>(null);

  // ─── Simulation Loop & Vehicle physics ───
  const vehiclesRef = useRef<SimulatedVehicle[]>([]);

  // ─── Ambient Clocks ───
  const [simTime, setSimTime] = useState(new Date());
  const [fps, setFps] = useState<number>(60);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const lastThemeChangeRef = useRef<number>(0);
  useEffect(() => {
    lastThemeChangeRef.current = performance.now();
  }, [theme]);

  // Helper to count queues for a specific junction and its N-S/E-W orientations
  const countQueuesForJunction = (jName: string) => {
    let nsQueue = 0;
    let ewQueue = 0;
    vehiclesRef.current.forEach(v => {
      const route = routes[v.routeIndex];
      const endNode = route[v.segmentIndex + 1];
      if (!endNode) return;

      const jNameNormalized = jName.toLowerCase().replace(' ', '_');
      const nodeKey = Object.keys(nodes).find(k => nodes[k as keyof typeof nodes].x === endNode.x && nodes[k as keyof typeof nodes].y === endNode.y);

      if (nodeKey && nodeKey === jNameNormalized) {
        const startNode = route[v.segmentIndex];
        const isVertical = startNode ? Math.abs(endNode.y - startNode.y) > Math.abs(endNode.x - startNode.x) : false;
        if (v.speed < 0.2) {
          if (isVertical) nsQueue++;
          else ewQueue++;
        }
      }
    });
    return { nsQueue, ewQueue };
  };

  // Helper to compute live queue metrics for sidebar
  const getJunctionAnalytics = (jName: string) => {
    let queueLength = 0;
    let totalWait = 0;
    let maxWait = 0;

    vehiclesRef.current.forEach(v => {
      const route = routes[v.routeIndex];
      const endNode = route[v.segmentIndex + 1];
      if (!endNode) return;

      const jNameNormalized = jName.toLowerCase().replace(' ', '_');
      const nodeKey = Object.keys(nodes).find(k => nodes[k as keyof typeof nodes].x === endNode.x && nodes[k as keyof typeof nodes].y === endNode.y);

      if (nodeKey && nodeKey === jNameNormalized) {
        if (v.speed < 0.2) {
          queueLength++;
          const wait = v.waitingTime || 0;
          totalWait += wait;
          if (wait > maxWait) maxWait = wait;
        }
      }
    });

    const avgWait = queueLength > 0 ? totalWait / queueLength : 0;

    let growthRate = 0.05;
    if (scenario === 'rush_hour') growthRate = 0.22;
    else if (scenario === 'accident' && jName === 'Junction Central') growthRate = 0.42;
    else if (scenario === 'normal') growthRate = 0.02;

    let mockThroughput = 12;
    if (jName === 'Junction Central') {
      mockThroughput = Math.max(2, 45 - Math.round(avgWait));
    } else {
      mockThroughput = Math.max(1, 24 - Math.round(avgWait * 0.8));
    }

    return {
      queueLength,
      avgWait: parseFloat(avgWait.toFixed(1)),
      maxWait: Math.round(maxWait),
      throughput: mockThroughput,
      growthRate: parseFloat((growthRate * queueLength).toFixed(2))
    };
  };

  // Helper to get active AI recommendation explainability card properties
  const getRecommendationForScenario = (scen: string) => {
    switch (scen) {
      case 'rush_hour':
        return {
          title: "Extend North-South Green Phase",
          reason: "High queue length detected on Broadway corridor N-S approaches. Extending phase reduces delay.",
          confidence: 91,
          delayReduction: 28,
          co2Reduction: 22,
          triggerMetrics: "Broadway Queue > 12, Delay > 35s"
        };
      case 'rain':
        return {
          title: "Wet Surface Friction Calibration",
          reason: "Precipitation active. Reducing vehicle speed limits by 15% to maintain safety braking margins.",
          confidence: 96,
          delayReduction: 12,
          co2Reduction: 8,
          triggerMetrics: "Rain precipitation > 2.5mm/h"
        };
      case 'fog':
        return {
          title: "Visibility Beacon Synchronization",
          reason: "Low visibility fog active. Synchronizing intersection beacon strobes to optimize spatial awareness.",
          confidence: 98,
          delayReduction: 8,
          co2Reduction: 5,
          triggerMetrics: "Visibility range < 150m"
        };
      case 'accident':
        return {
          title: "Emergency detour at Broadway & 42nd",
          reason: "Broadway Lane Collision block. Rerouting incoming traffic to West Boulevard corridor.",
          confidence: 99,
          delayReduction: 34,
          co2Reduction: 18,
          triggerMetrics: "Obstruction = 100%, Queue growth = +0.42/s"
        };
      case 'closure':
        return {
          title: "Divert to East Crossing Detour",
          reason: "South Expressway closure active. Detouring all southbound traffic to East Crossing.",
          confidence: 99,
          delayReduction: 40,
          co2Reduction: 20,
          triggerMetrics: "Road Closure = 100%, Redirect Index = 1.0"
        };
      case 'construction':
        return {
          title: "Work Zone Speed Calibration",
          reason: "Expressway Construction zone. Reducing speed limits to 30km/h and extending green timings.",
          confidence: 89,
          delayReduction: 18,
          co2Reduction: 10,
          triggerMetrics: "Construction Block = Active, Speed = -40%"
        };
      case 'vip':
        return {
          title: "VIP Security Convoy Priority Lock",
          reason: "Dignitary escort convoy detected. Locking upcoming signals to green and holding cross streets.",
          confidence: 99,
          delayReduction: 45,
          co2Reduction: 14,
          triggerMetrics: "VIP Convoy ID = 880, Security Corridor = Active"
        };
      case 'ambulance':
        return {
          title: "Ambulance Priority Green Corridor",
          reason: "Active emergency vehicle detected on North approach. Synchronizing green wave path.",
          confidence: 99,
          delayReduction: 50,
          co2Reduction: 15,
          triggerMetrics: "Emergency = Ambulance, Corridor Lock = Active"
        };
      case 'fire_truck':
        return {
          title: "Fire Truck Priority Green Corridor",
          reason: "Active emergency fire truck detected. Priority preemption green wave corridor locked.",
          confidence: 99,
          delayReduction: 50,
          co2Reduction: 15,
          triggerMetrics: "Emergency = Fire Truck, Corridor Lock = Active"
        };
      default:
        return {
          title: "AI Adaptive Flow Balancing",
          reason: "Traffic density within baseline limits. Signal timers optimized via queue length derivatives.",
          confidence: 94,
          delayReduction: 15,
          co2Reduction: 12,
          triggerMetrics: "Density < 40%, Average wait < 20s"
        };
    }
  };

  // Helper to calculate before/after statistics
  const getScenarioStats = () => {
    let totalQueue = 0;
    let totalWait = 0;

    vehiclesRef.current.forEach(v => {
      if (v.speed < 0.2) {
        totalQueue++;
        totalWait += v.waitingTime || 0;
      }
    });

    const liveAvgWait = totalQueue > 0 ? totalWait / totalQueue : 0;
    const optWait = Math.max(2, Math.round(liveAvgWait));
    const optQueue = totalQueue;

    const optHealth = Math.max(10, Math.min(99, Math.round(100 - optQueue * 1.5 - optWait * 1.2)));
    const co2Reduction = scenario === 'normal' ? 14 : scenario === 'rush_hour' ? 22 : 10;

    const baselineHealth = Math.max(12, Math.round(optHealth * 0.7 - 5));
    const baselineWait = Math.round(optWait * 2.4 + 8);
    const baselineQueue = Math.round(optQueue * 1.6 + 4);

    return {
      baselineHealth,
      baselineWait,
      baselineQueue,
      optHealth,
      optWait,
      optQueue,
      co2Reduction
    };
  };

  const stats = getScenarioStats();
  const recCard = getRecommendationForScenario(scenario);

  // Scenario presets handler
  const handleScenarioChange = (newScen: typeof scenario) => {
    setScenario(newScen);
    playSynthesizedSound('success');

    // Clear old emergency vehicles
    vehiclesRef.current = vehiclesRef.current.filter(v => v.id !== 999 && v.id !== 998 && (v.id < 881 || v.id > 883));

    const colors = ['#38bdf8', '#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#f87171'];
    const types: SimulatedVehicle['type'][] = ['car', 'truck', 'bus', 'motorcycle'];
    const list: SimulatedVehicle[] = [];

    const spawnCount = newScen === 'rush_hour' ? 90 : 45;

    for (let i = 0; i < spawnCount; i++) {
      const routeIndex = Math.floor(Math.random() * routes.length);
      const segmentIndex = Math.floor(Math.random() * (routes[routeIndex].length - 1));
      const progress = Math.random();
      const type = types[Math.floor(Math.random() * types.length)];
      const maxSpeed = type === 'motorcycle' ? 2.8 : type === 'truck' ? 1.6 : type === 'bus' ? 1.4 : 2.2;

      list.push({
        id: i + 200,
        type,
        x: 0,
        y: 0,
        speed: maxSpeed,
        maxSpeed,
        routeIndex,
        segmentIndex,
        progress,
        color: colors[Math.floor(Math.random() * colors.length)],
        isSelected: false
      });
    }

    if (newScen === 'ambulance') {
      const ambulance: SimulatedVehicle = {
        id: 999,
        type: 'ambulance',
        x: 0,
        y: 0,
        speed: 3.2,
        maxSpeed: 3.2,
        routeIndex: 0,
        segmentIndex: 0,
        progress: 0,
        color: '#f43f5e',
        isSelected: false
      };
      list.unshift(ambulance);
      addEvent('WARNING', 'Emergency dispatch: Ambulance dispatched on route 0 (Broadway Corridor).', 'AI_ROUTING');
    } else if (newScen === 'fire_truck') {
      const fireTruck: SimulatedVehicle = {
        id: 998,
        type: 'truck',
        x: 0,
        y: 0,
        speed: 2.8,
        maxSpeed: 2.8,
        routeIndex: 0,
        segmentIndex: 0,
        progress: 0,
        color: '#ef4444',
        isSelected: false
      };
      list.unshift(fireTruck);
      addEvent('WARNING', 'Emergency dispatch: Fire Truck dispatched on route 0.', 'AI_ROUTING');
    } else if (newScen === 'vip') {
      const vipColors = ['#020617', '#0f172a', '#1e293b'];
      for (let i = 0; i < 3; i++) {
        list.unshift({
          id: 881 + i,
          type: 'car',
          x: 0,
          y: 0,
          speed: 2.2,
          maxSpeed: 2.2,
          routeIndex: 1,
          segmentIndex: 0,
          progress: 0.08 * i,
          color: vipColors[i],
          isSelected: false
        });
      }
      addEvent('WARNING', 'VIP Escort convoy initiated on route 1.', 'SECURITY');
    } else {
      addEvent('INFO', `Traffic scenario preset loaded: ${newScen.toUpperCase().replace('_', ' ')}`, 'CONTROLLER');
    }

    vehiclesRef.current = list;
  };

  // ─── Local Timing Cycles for Simulated Junctions ───
  const [junctionTimers, setJunctionTimers] = useState<Record<string, { phase: 'NORTH_SOUTH' | 'EAST_WEST'; seconds: number; mode: 'AUTO' | 'MANUAL' | 'ADAPTIVE' }>>({
    'Junction Central': { phase: 'NORTH_SOUTH', seconds: 18, mode: 'ADAPTIVE' },
    'West Boulevard': { phase: 'EAST_WEST', seconds: 8, mode: 'AUTO' },
    'East Crossing': { phase: 'NORTH_SOUTH', seconds: 24, mode: 'AUTO' },
    'South Expressway': { phase: 'EAST_WEST', seconds: 12, mode: 'AUTO' }
  });

  // ─── Sync local store state with Junction Central ───
  useEffect(() => {
    setJunctionTimers(prev => ({
      ...prev,
      'Junction Central': {
        phase: activePhase,
        seconds: secondsRemaining,
        mode: prev['Junction Central'].mode
      }
    }));
  }, [activePhase, secondsRemaining]);

  // ─── Local countdown loop & AI Adaptive Traffic Logic ───
  useEffect(() => {
    const interval = setInterval(() => {
      setJunctionTimers(prev => {
        const copy = { ...prev };
        
        // Find if there is an active emergency/priority vehicle
        const emergencyVehicle = vehiclesRef.current.find(v => v.id === 999 || v.id === 998 || v.id === 881);
        let emergencyTargetJunction: string | null = null;
        let emergencyTargetPhase: 'NORTH_SOUTH' | 'EAST_WEST' = 'NORTH_SOUTH';

        if (emergencyVehicle) {
          const route = routes[emergencyVehicle.routeIndex];
          const nextNode = route[emergencyVehicle.segmentIndex + 1];
          if (nextNode) {
            const nodeKey = Object.keys(nodes).find(key => nodes[key as keyof typeof nodes].x === nextNode.x && nodes[key as keyof typeof nodes].y === nextNode.y);
            if (nodeKey) {
              emergencyTargetJunction = nodeKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              const startNode = route[emergencyVehicle.segmentIndex];
              const isVertical = startNode ? Math.abs(nextNode.y - startNode.y) > Math.abs(nextNode.x - startNode.x) : false;
              emergencyTargetPhase = isVertical ? 'NORTH_SOUTH' : 'EAST_WEST';
            }
          }
        }

        Object.keys(copy).forEach(name => {
          if (name === 'Junction Central' && copy[name].mode !== 'MANUAL' && !emergencyVehicle) {
            copy[name] = {
              phase: activePhase,
              seconds: secondsRemaining,
              mode: copy[name].mode
            };
            return;
          }

          const j = copy[name];

          // EMERGENCY GREEN CORRIDOR OVERRIDE
          if (emergencyVehicle && emergencyTargetJunction === name) {
            if (j.phase !== emergencyTargetPhase || j.mode !== 'MANUAL') {
              copy[name] = {
                phase: emergencyTargetPhase,
                seconds: 15,
                mode: 'MANUAL'
              };
              addEvent('WARNING', `Emergency Green Corridor locked at ${name} (${emergencyTargetPhase === 'NORTH_SOUTH' ? 'Broadway' : '42nd St'}) for approaching emergency vehicle.`, 'AI_ROUTING');
            }
            return;
          }

          // Restore from manual emergency lock if emergency vehicle cleared
          if (j.mode === 'MANUAL' && (!emergencyVehicle || emergencyTargetJunction !== name)) {
            copy[name] = {
              phase: j.phase,
              seconds: 20,
              mode: 'ADAPTIVE'
            };
            addEvent('INFO', `Emergency cleared. Restoring adaptive timing cycle at ${name}.`, 'AI_ROUTING');
            return;
          }

          if (j.mode === 'MANUAL') return;

          // Normal countdown
          if (j.seconds > 1) {
            copy[name] = { ...j, seconds: j.seconds - 1 };
          } else {
            // AI Adaptive timing offsets determination
            const { nsQueue, ewQueue } = countQueuesForJunction(name);
            const nextPhase = j.phase === 'NORTH_SOUTH' ? 'EAST_WEST' : 'NORTH_SOUTH';
            let nextSec = nextPhase === 'NORTH_SOUTH' ? 30 : 20;

            if (j.mode === 'ADAPTIVE') {
              if (nextPhase === 'NORTH_SOUTH' && nsQueue > ewQueue + 2) {
                nextSec = 40;
                addEvent('INFO', `AI Adaptive extend green at ${name}: N-S allocated 40s (+10s delay balance).`, 'AI_ROUTING');
              } else if (nextPhase === 'EAST_WEST' && ewQueue > nsQueue + 2) {
                nextSec = 30;
                addEvent('INFO', `AI Adaptive extend green at ${name}: E-W allocated 30s (+10s delay balance).`, 'AI_ROUTING');
              }
            }

            copy[name] = { ...j, phase: nextPhase, seconds: nextSec };
          }
        });
        return copy;
      });
      setSimTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [activePhase, secondsRemaining]);

  // ─── Manual Signal Actuation Trigger ───
  const toggleSignalPhaseManual = useCallback((name: string) => {
    playSynthesizedSound('click');
    setJunctionTimers(prev => {
      const target = prev[name];
      const nextPhase = target.phase === 'NORTH_SOUTH' ? 'EAST_WEST' : 'NORTH_SOUTH';
      addEvent('WARNING', `Manual override: Toggled ${name} signal phase to ${nextPhase}`, 'OPERATOR');
      return {
        ...prev,
        [name]: {
          ...target,
          phase: nextPhase,
          seconds: 15,
          mode: 'MANUAL'
        }
      };
    });
  }, [addEvent]);

  const setJunctionControlMode = useCallback((name: string, mode: 'AUTO' | 'MANUAL' | 'ADAPTIVE') => {
    playSynthesizedSound('success');
    setJunctionTimers(prev => {
      addEvent('INFO', `Changed control mode of ${name} to ${mode}`, 'CONTROLLER');
      return {
        ...prev,
        [name]: { ...prev[name], mode }
      };
    });
  }, [addEvent]);

  // ─── Coordinate Paths Map Defs ───
  const nodes = {
    west_outskirts: { x: 100, y: 400 },
    west_boulevard: { x: 300, y: 400 },
    junction_central: { x: 800, y: 600 },
    east_crossing: { x: 1300, y: 500 },
    east_outskirts: { x: 1550, y: 500 },
    north_outskirts: { x: 800, y: 50 },
    south_expressway: { x: 900, y: 1000 },
    south_outskirts: { x: 900, y: 1150 }
  };

  // Pre-calculated route segments
  const routes = [
    // Route 0: West Outskirts -> West Boulevard -> Junction Central -> South Expressway -> South Outskirts (Broadway Corridor)
    [nodes.west_outskirts, nodes.west_boulevard, nodes.junction_central, nodes.south_expressway, nodes.south_outskirts],
    // Route 1: South Outskirts -> South Expressway -> Junction Central -> East Crossing -> East Outskirts
    [nodes.south_outskirts, nodes.south_expressway, nodes.junction_central, nodes.east_crossing, nodes.east_outskirts],
    // Route 2: North Outskirts -> Junction Central -> West Boulevard -> West Outskirts
    [nodes.north_outskirts, nodes.junction_central, nodes.west_boulevard, nodes.west_outskirts],
    // Route 3: East Outskirts -> East Crossing -> Junction Central -> North Outskirts
    [nodes.east_outskirts, nodes.east_crossing, nodes.junction_central, nodes.north_outskirts]
  ];

  // ─── Canvas Interaction Callbacks (Pan & Zoom) ───
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.map-node')) return; // Avoid drag on node clicks
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 1.1;
    const nextScale = e.deltaY < 0 ? transform.scale * zoomFactor : transform.scale / zoomFactor;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.3, Math.min(3, nextScale))
    }));
  };

  const handleResetZoom = () => {
    setTransform({ x: 60, y: 40, scale: 0.5 });
    playSynthesizedSound('click');
  };

  const handleNodeClick = (name: string) => {
    setSelectedJunction(name);
    playSynthesizedSound('success');
  };



  // Synchronize initial and scenario-based vehicle spawning
  useEffect(() => {
    handleScenarioChange(scenario);
  }, [scenario]);

  // Keep latest dynamic render values in Refs to avoid tearing down the canvas loop
  const junctionTimersRef = useRef(junctionTimers);
  const weatherRef = useRef(weather);
  const activeIncidentRef = useRef(activeIncident);
  const selectedVehicleRef = useRef(selectedVehicle);
  const isEmergencyActiveRef = useRef(isEmergencyActive);
  const heatmapModeRef = useRef(heatmapMode);
  const lastMetricsRef = useRef(lastMetrics);
  const themeRef = useRef(theme);
  const scenarioRef = useRef(scenario);

  // Sync refs on render
  useEffect(() => {
    junctionTimersRef.current = junctionTimers;
    weatherRef.current = weather;
    activeIncidentRef.current = activeIncident;
    selectedVehicleRef.current = selectedVehicle;
    isEmergencyActiveRef.current = isEmergencyActive;
    heatmapModeRef.current = heatmapMode;
    lastMetricsRef.current = lastMetrics;
    themeRef.current = theme;
    scenarioRef.current = scenario;
  }, [junctionTimers, weather, activeIncident, selectedVehicle, isEmergencyActive, heatmapMode, lastMetrics, theme, scenario]);

  // ─── Core Canvas Draw Loop ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;

    const getRoadColor = (level: number) => {
      const isDark = themeRef.current === 'dark';
      if (!heatmapModeRef.current) return isDark ? '#1e293b' : '#94a3b8';
      if (level < 25) return '#10b981'; // Green
      if (level < 50) return '#eab308'; // Yellow
      if (level < 75) return '#f97316'; // Orange
      return '#ef4444'; // Red
    };

    const draw = () => {
      // Pause drawing completely when page is hidden to save CPU/GPU resources
      if (document.hidden) {
        animId = requestAnimationFrame(draw);
        return;
      }

      const isDark = themeRef.current === 'dark';
      // FPS measurement
      frameCountRef.current++;
      const time = performance.now();
      if (time >= lastFpsUpdateRef.current + 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (time - lastFpsUpdateRef.current)));
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = time;
      }

      ctx.clearRect(0, 0, 1600, 1200);

      // ── Draw Topographic Background Grid ──
      ctx.fillStyle = isDark ? '#07080c' : '#f8fafc';
      ctx.fillRect(0, 0, 1600, 1200);

      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 1600; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1200); ctx.stroke();
      }
      for (let i = 0; i < 1200; i += 60) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1600, i); ctx.stroke();
      }

      // ── Draw River ──
      ctx.strokeStyle = isDark ? '#0f172a' : '#cbd5e1';
      ctx.lineWidth = 90;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 200);
      ctx.bezierCurveTo(400, 220, 600, 450, 900, 900);
      ctx.quadraticCurveTo(1250, 1000, 1600, 1100);
      ctx.stroke();

      ctx.strokeStyle = isDark ? '#0284c7' : '#0ea5e9';
      ctx.lineWidth = 74;
      ctx.beginPath();
      ctx.moveTo(0, 200);
      ctx.bezierCurveTo(400, 220, 600, 450, 900, 900);
      ctx.quadraticCurveTo(1250, 1000, 1600, 1100);
      ctx.stroke();

      // ── Draw Green Park ──
      ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.08)';
      ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(500, 200, 220, 240, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.35)';
      ctx.beginPath();
      ctx.arc(560, 260, 10, 0, Math.PI * 2);
      ctx.arc(590, 275, 14, 0, Math.PI * 2);
      ctx.arc(640, 330, 12, 0, Math.PI * 2);
      ctx.fill();

      // ── Draw Skyscraper Blocks ──
      ctx.fillStyle = isDark ? 'rgba(51, 65, 85, 0.12)' : 'rgba(148, 163, 184, 0.15)';
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)';
      ctx.beginPath();
      ctx.roundRect(1000, 100, 240, 300, 10);
      ctx.roundRect(120, 700, 300, 320, 10);
      ctx.fill();
      ctx.stroke();

      // Draw subtle glowing window lights in skyscraper blocks during Night Mode (dark theme)
      if (isDark) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.35)'; // soft yellow windows
        for (let wx = 1020; wx < 1220; wx += 35) {
          for (let wy = 130; wy < 370; wy += 45) {
            if ((wx + wy) % 3 !== 0) {
              ctx.fillRect(wx, wy, 8, 12);
            }
          }
        }
        for (let wx = 140; wx < 390; wx += 40) {
          for (let wy = 730; wy < 990; wy += 50) {
            if ((wx + wy) % 4 !== 0) {
              ctx.fillRect(wx, wy, 10, 14);
            }
          }
        }
      }

      // ── Draw Roads ──
      const drawRoadSegment = (start: { x: number; y: number }, end: { x: number; y: number }, congestion: number) => {
        const roadColor = getRoadColor(congestion);
        ctx.strokeStyle = roadColor;
        ctx.lineWidth = 26;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Inner asphalt core
        ctx.strokeStyle = isDark ? '#090d16' : '#cbd5e1';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Lane dashed divider
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      const congestionCentral = lastMetrics ? Math.round(lastMetrics.congestion_score * 100) : 34;

      drawRoadSegment(nodes.west_outskirts, nodes.west_boulevard, 22);
      drawRoadSegment(nodes.west_boulevard, nodes.junction_central, activeIncident === 'accident' ? 95 : 44);
      drawRoadSegment(nodes.junction_central, nodes.east_crossing, congestionCentral);
      drawRoadSegment(nodes.east_crossing, nodes.east_outskirts, 18);
      drawRoadSegment(nodes.north_outskirts, nodes.junction_central, 31);
      drawRoadSegment(nodes.junction_central, nodes.south_expressway, activeIncident === 'closure' ? 99 : 52);
      drawRoadSegment(nodes.south_expressway, nodes.south_outskirts, 38);

      // ── Draw Crosswalks ──
      const drawCrosswalk = (cx: number, cy: number) => {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy - 25); ctx.lineTo(cx + 30, cy - 25);
        ctx.moveTo(cx - 30, cy + 25); ctx.lineTo(cx + 30, cy + 25);
        ctx.moveTo(cx - 25, cy - 30); ctx.lineTo(cx - 25, cy + 30);
        ctx.moveTo(cx + 25, cy - 30); ctx.lineTo(cx + 25, cy + 30);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      drawCrosswalk(nodes.junction_central.x, nodes.junction_central.y);
      drawCrosswalk(nodes.west_boulevard.x, nodes.west_boulevard.y);
      drawCrosswalk(nodes.east_crossing.x, nodes.east_crossing.y);
      drawCrosswalk(nodes.south_expressway.x, nodes.south_expressway.y);

      // ── Draw Incident Warning Markers ──
      if (activeIncidentRef.current === 'accident') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(550, 500, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', 550, 504);
      }
      if (activeIncidentRef.current === 'closure') {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(850, 800, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚧', 850, 804);
      }

      // ── Draw Emergency corridor path highlighted ──
      if (isEmergencyActiveRef.current) {
        if (isDark) {
          ctx.strokeStyle = `rgba(244, 63, 94, ${0.55 + 0.2 * Math.sin(performance.now() / 200)})`;
          ctx.lineWidth = 34;
        } else {
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
          ctx.lineWidth = 30;
        }
        ctx.setLineDash([20, 10]);
        ctx.beginPath();
        ctx.moveTo(nodes.west_outskirts.x, nodes.west_outskirts.y);
        ctx.lineTo(nodes.west_boulevard.x, nodes.west_boulevard.y);
        ctx.lineTo(nodes.junction_central.x, nodes.junction_central.y);
        ctx.lineTo(nodes.south_expressway.x, nodes.south_expressway.y);
        ctx.lineTo(nodes.south_outskirts.x, nodes.south_outskirts.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── Draw Traffic Signals Light actutations ──
      const drawTrafficSignals = (name: string, cx: number, cy: number) => {
        const target = junctionTimersRef.current[name];
        if (!target) return;

        const nsColor = target.phase === 'NORTH_SOUTH' ? '#10b981' : '#ef4444';
        const ewColor = target.phase === 'EAST_WEST' ? '#10b981' : '#ef4444';

        // Draw light frames
        ctx.fillStyle = isDark ? '#0f172a' : '#475569';
        ctx.fillRect(cx - 35, cy - 8, 14, 16); // Left signal (E-W)
        ctx.fillRect(cx + 21, cy - 8, 14, 16); // Right signal (E-W)
        ctx.fillRect(cx - 8, cy - 35, 16, 14); // Top signal (N-S)
        ctx.fillRect(cx - 8, cy + 21, 16, 14); // Bottom signal (N-S)

        // Calculate dim factor: dims briefly during theme transitions, then restores
        const msSinceToggle = performance.now() - lastThemeChangeRef.current;
        const signalDimFactor = msSinceToggle < 400 ? 0.3 + 0.7 * (msSinceToggle / 400) : 1.0;

        // Helper to draw LED with a glowing halo in dark mode
        const drawSignalLED = (x: number, y: number, color: string) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 4 * signalDimFactor, 0, Math.PI * 2);
          ctx.fill();

          if (isDark) {
            const glowColor = color === '#10b981' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
            const grad = ctx.createRadialGradient(x, y, 3 * signalDimFactor, x, y, 12 * signalDimFactor);
            grad.addColorStop(0, glowColor);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, 12 * signalDimFactor, 0, Math.PI * 2);
            ctx.fill();
          }
        };

        // Draw active LED circles
        drawSignalLED(cx, cy - 28, nsColor);
        drawSignalLED(cx, cy + 28, nsColor);
        drawSignalLED(cx - 28, cy, ewColor);
        drawSignalLED(cx + 28, cy, ewColor);
      };

      Object.keys(junctionTimersRef.current).forEach(name => {
        const coord = nodes[name.toLowerCase().replace(' ', '_') as keyof typeof nodes];
        if (coord) drawTrafficSignals(name, coord.x, coord.y);
      });

      // ── Update and Draw Moving Vehicles ──
      const list = vehiclesRef.current;
      const weatherFactor = scenarioRef.current === 'rain' ? 0.65 : scenarioRef.current === 'fog' ? 0.45 : 1;

      list.forEach((vehicle) => {
        const route = routes[vehicle.routeIndex];
        const start = route[vehicle.segmentIndex];
        const end = route[vehicle.segmentIndex + 1];

        if (!start || !end) {
          vehicle.segmentIndex = 0;
          vehicle.progress = 0;
          vehicle.waitingTime = 0;
          return;
        }

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const segLen = Math.hypot(dx, dy);

        let currentTargetSpeed = vehicle.maxSpeed * weatherFactor;

        // Construction slowing factor
        if (scenarioRef.current === 'construction' && end === nodes.south_expressway && start === nodes.junction_central) {
          currentTargetSpeed = vehicle.maxSpeed * 0.35;
        }

        const distToJunction = (1 - vehicle.progress) * segLen;

        const junctionName = Object.keys(nodes).find(
          key => nodes[key as keyof typeof nodes].x === end.x && nodes[key as keyof typeof nodes].y === end.y
        );

        if (junctionName) {
          const timerName = junctionName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const timer = junctionTimersRef.current[timerName];

          if (timer) {
            const isVertical = Math.abs(dy) > Math.abs(dx);
            const isGreen = isVertical 
              ? timer.phase === 'NORTH_SOUTH' 
              : timer.phase === 'EAST_WEST';

            if (!isGreen && distToJunction < 70) {
              currentTargetSpeed = 0;
            }
          }
        }

        if (activeIncident === 'accident' && end === nodes.junction_central && start === nodes.west_boulevard) {
          if (distToJunction < 180 && distToJunction > 120) {
            currentTargetSpeed = 0.2;
          }
        }
        if (activeIncident === 'closure' && end === nodes.south_expressway && start === nodes.junction_central) {
          if (distToJunction < 120) {
            currentTargetSpeed = 0;
          }
        }

        // Apply acceleration or deceleration
        if (vehicle.speed < currentTargetSpeed) {
          vehicle.speed = Math.min(currentTargetSpeed, vehicle.speed + 0.08);
        } else if (vehicle.speed > currentTargetSpeed) {
          vehicle.speed = Math.max(currentTargetSpeed, vehicle.speed - 0.15);
        }

        // Track waiting timers
        if (vehicle.speed < 0.2) {
          vehicle.waitingTime = (vehicle.waitingTime || 0) + 1 / 60; // 60 FPS tick
        }

        vehicle.progress += (vehicle.speed) / segLen;

        if (vehicle.progress >= 1) {
          vehicle.segmentIndex++;
          vehicle.progress = 0;
          vehicle.waitingTime = 0; // Reset wait time on crossing junction
        }

        vehicle.x = lerp(start.x, end.x, vehicle.progress);
        vehicle.y = lerp(start.y, end.y, vehicle.progress);

        const isEmergencyCar = vehicle.type === 'ambulance' || vehicle.id === 998 || (vehicle.id >= 881 && vehicle.id <= 883);
        const shapeColor = vehicle.type === 'ambulance' ? '#f43f5e' : vehicle.id === 998 ? '#ef4444' : vehicle.color;
        const radius = vehicle.type === 'truck' ? 7 : vehicle.type === 'bus' ? 9 : 4.5;

        // Draw headlights beam in Night Mode
        if (isDark) {
          const vStart = route[vehicle.segmentIndex];
          const vEnd = route[vehicle.segmentIndex + 1];
          if (vStart && vEnd) {
            const angle = Math.atan2(vEnd.y - vStart.y, vEnd.x - vStart.x);
            ctx.save();
            ctx.translate(vehicle.x, vehicle.y);
            ctx.rotate(angle);
            
            const beamLength = vehicle.type === 'ambulance' ? 35 : 25;
            const grad = ctx.createRadialGradient(0, 0, 2, beamLength * 0.5, 0, beamLength);
            grad.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
            grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, beamLength, -Math.PI / 8, Math.PI / 8);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.restore();
          }
        }

        ctx.fillStyle = shapeColor;
        ctx.beginPath();
        ctx.arc(vehicle.x, vehicle.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing emergency strobe lights for Emergency Vehicles and VIP convoy
        if (isEmergencyCar) {
          const strobeOn = Math.floor(performance.now() / 120) % 2 === 0;
          if (strobeOn) {
            ctx.fillStyle = vehicle.id >= 881 && vehicle.id <= 883 ? '#3b82f6' : '#ef4444'; // blue for VIP, red for ambulance/fire
            ctx.beginPath();
            ctx.arc(vehicle.x, vehicle.y, radius + 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (selectedVehicleRef.current?.id === vehicle.id) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(vehicle.x, vehicle.y, radius + 7, 0, Math.PI * 2);
          ctx.stroke();

          // Draw future route path (Explainable AI)
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(vehicle.x, vehicle.y);
          for (let k = vehicle.segmentIndex + 1; k < route.length; k++) {
            ctx.lineTo(route[k].x, route[k].y);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`ID ${vehicle.id} (TRACKED)`, vehicle.x - 25, vehicle.y - radius - 12);
        }
      });

      // ── Draw Construction zone markers if scenario is construction ──
      if (scenarioRef.current === 'construction') {
        ctx.fillStyle = '#f97316'; // construction orange
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        // Draw 3 orange construction drums along the South Expressway
        const conePoints = [
          { x: 865, y: 780 },
          { x: 885, y: 840 },
          { x: 905, y: 900 }
        ];
        conePoints.forEach((p) => {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + 6);
          ctx.lineTo(p.x - 5, p.y - 6);
          ctx.lineTo(p.x + 5, p.y - 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // White stripe
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(p.x - 3, p.y - 2, 6, 2);
          ctx.fillStyle = '#f97316';
        });
      }

      // ── Draw Weather Effects Overlays ──
      if (scenarioRef.current === 'rain') {
        ctx.strokeStyle = isDark ? 'rgba(156, 163, 175, 0.22)' : 'rgba(100, 116, 139, 0.28)';
        ctx.lineWidth = 1;
        const rainSeed = Math.floor(performance.now() / 40) % 25;
        for (let rx = -100; rx < 1600; rx += 60) {
          ctx.beginPath();
          ctx.moveTo(rx + rainSeed, 0);
          ctx.lineTo(rx + rainSeed - 80, 1200);
          ctx.stroke();
        }
      }

      if (scenarioRef.current === 'fog') {
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.35)' : 'rgba(241, 245, 249, 0.3)';
        ctx.fillRect(0, 0, 1600, 1200);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // ─── Click detection on Canvas (for selecting vehicles/incidents) ───
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (1600 / rect.width);
    const clickY = (e.clientY - rect.top) * (1200 / rect.height);

    const match = vehiclesRef.current.find(v => Math.hypot(v.x - clickX, v.y - clickY) < 18);
    if (match) {
      setSelectedVehicle(match);
      playSynthesizedSound('success');
    } else {
      setSelectedVehicle(null);
    }
  };

  // ─── Interactive Intersections Definition ───
  const intersections: IntersectionData[] = [
    {
      name: 'Junction Central',
      x: 800,
      y: 600,
      health: Math.max(10, 100 - getJunctionAnalytics('Junction Central').queueLength * 6 - getJunctionAnalytics('Junction Central').maxWait),
      count: getJunctionAnalytics('Junction Central').queueLength + Math.round(getJunctionAnalytics('Junction Central').throughput / 4),
      congestion: Math.min(99, getJunctionAnalytics('Junction Central').queueLength * 8),
      phase: junctionTimers['Junction Central']?.phase || 'NORTH_SOUTH',
      seconds: junctionTimers['Junction Central']?.seconds || 15,
      emergency: activeEmergency !== 'none',
      rec: activeEmergency !== 'none' ? 'Emergency Green Corridor Priority Preemption Active.' : 'Optimal dynamic queue balancing.',
      mode: junctionTimers['Junction Central']?.mode || 'AUTO'
    },
    {
      name: 'West Boulevard',
      x: 300,
      y: 400,
      health: Math.max(10, 100 - getJunctionAnalytics('West Boulevard').queueLength * 6 - getJunctionAnalytics('West Boulevard').maxWait),
      count: getJunctionAnalytics('West Boulevard').queueLength + Math.round(getJunctionAnalytics('West Boulevard').throughput / 4),
      congestion: Math.min(99, getJunctionAnalytics('West Boulevard').queueLength * 8),
      phase: junctionTimers['West Boulevard']?.phase || 'EAST_WEST',
      seconds: junctionTimers['West Boulevard']?.seconds || 8,
      emergency: false,
      rec: 'Moderate delay index eastbound. Adjust offset timing.',
      mode: junctionTimers['West Boulevard']?.mode || 'AUTO'
    },
    {
      name: 'East Crossing',
      x: 1300,
      y: 500,
      health: Math.max(10, 100 - getJunctionAnalytics('East Crossing').queueLength * 6 - getJunctionAnalytics('East Crossing').maxWait),
      count: getJunctionAnalytics('East Crossing').queueLength + Math.round(getJunctionAnalytics('East Crossing').throughput / 4),
      congestion: Math.min(99, getJunctionAnalytics('East Crossing').queueLength * 8),
      phase: junctionTimers['East Crossing']?.phase || 'NORTH_SOUTH',
      seconds: junctionTimers['East Crossing']?.seconds || 24,
      emergency: false,
      rec: 'Timing cycles optimal. Peak green bandwidth active.',
      mode: junctionTimers['East Crossing']?.mode || 'AUTO'
    },
    {
      name: 'South Expressway',
      x: 900,
      y: 1000,
      health: Math.max(10, 100 - getJunctionAnalytics('South Expressway').queueLength * 6 - getJunctionAnalytics('South Expressway').maxWait),
      count: getJunctionAnalytics('South Expressway').queueLength + Math.round(getJunctionAnalytics('South Expressway').throughput / 4),
      congestion: Math.min(99, getJunctionAnalytics('South Expressway').queueLength * 8),
      phase: junctionTimers['South Expressway']?.phase || 'EAST_WEST',
      seconds: junctionTimers['South Expressway']?.seconds || 12,
      emergency: activeEmergency !== 'none',
      rec: activeEmergency !== 'none' ? 'Emergency preemption triggered.' : 'High flow ingress. Autopilot adapting signal offsets.',
      mode: junctionTimers['South Expressway']?.mode || 'AUTO'
    }
  ];

  const activeJunction = intersections.find(i => i.name === selectedJunction) || intersections[0];

  return (
    <div className={`flex-1 flex flex-col xl:flex-row overflow-hidden min-h-0 relative ${
      theme === 'dark' ? 'bg-[#07080c]' : 'bg-slate-50'
    }`}>
      {/* ─── Map Canvas Viewport (Linear/Apple maps feel) ─── */}
      <div 
        ref={canvasViewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        className={`flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden border-b xl:border-b-0 xl:border-r ${
          theme === 'dark' ? 'border-white/5 bg-slate-950/60' : 'border-slate-200 bg-white/50'
        }`}
      >
        {/* Dynamic Zoom Control Indicators */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleResetZoom}
            className={`flex items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer shadow-lg backdrop-blur-md ${
              theme === 'dark' ? 'border-white/5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700'
            }`}
            title="Reset Map Bounds"
          >
            <Navigation className="h-4 w-4 rotate-45 text-emerald-450" />
          </button>

          <div className={`flex rounded-xl p-1 shadow-lg backdrop-blur-md border ${
            theme === 'dark' ? 'bg-slate-900/80 border-white/5' : 'bg-white/80 border-slate-200'
          }`}>
            <button
              onClick={() => setHeatmapMode((h) => !h)}
              className={`p-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                heatmapMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">HEATMAP</span>
            </button>
          </div>
        </div>

        {/* 60 FPS Real-time Simulation Canvas */}
        <canvas
          ref={canvasRef}
          width="1600"
          height="1200"
          className="w-full h-full object-contain pointer-events-none"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        />

        {/* Interactive Clickable SVG Overlays */}
        <svg
          viewBox="0 0 1600 1200"
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
          {intersections.map((node) => {
            const isSelected = selectedJunction === node.name;
            const healthColor = node.health >= 80 ? '#10b981' : node.health >= 50 ? '#eab308' : '#ef4444';
            const localTimer = junctionTimers[node.name] || { phase: 'NORTH_SOUTH', seconds: 0 };

            return (
              <g 
                key={node.name}
                className="map-node cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={() => handleNodeClick(node.name)}
                onMouseEnter={() => setHoveredIntersection(node.name)}
                onMouseLeave={() => setHoveredIntersection(null)}
              >
                {/* Clickable node hitboxes */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="30"
                  fill="transparent"
                  stroke={isSelected ? healthColor : 'transparent'}
                  strokeWidth="1.5"
                />

                {/* Node hover HUD metrics card */}
                {hoveredIntersection === node.name && (
                  <g transform={`translate(${node.x}, ${node.y - 70})`}>
                    <rect
                      x="-70"
                      y="-35"
                      width="140"
                      height="54"
                      rx="8"
                      fill="#020617"
                      stroke="rgba(255, 255, 255, 0.15)"
                      strokeWidth="1"
                    />
                    <text x="0" y="-20" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">
                      {node.name.toUpperCase()}
                    </text>
                    <text x="0" y="-8" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="black" fontFamily="monospace">
                      Health Index: {node.health}%
                    </text>
                    <text x="0" y="4" textAnchor="middle" fill="#64748b" fontSize="8">
                      Phase: {localTimer.phase} ({localTimer.seconds}s)
                    </text>
                    <text x="0" y="14" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                      Select for controls
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Diagnostic Watermarks */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end pointer-events-none text-right font-mono">
          <span className="text-[10px] font-black text-slate-400">SMART CITY DIGITAL TWIN</span>
          <span className="text-[8px] text-slate-600 uppercase font-bold mt-1">SIMULATOR FPS: {fps}</span>
          <span className="text-[8px] text-slate-600 uppercase font-bold mt-0.5">Time: {simTime.toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
      </div>

      {/* ─── Side Telemetry Drawer (SimCity dashboard layout) ─── */}
      <div className={`w-full xl:w-96 flex flex-col border-t xl:border-t-0 backdrop-blur-md p-6 overflow-y-auto space-y-6 relative z-10 shrink-0 ${
        theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-white/60 border-slate-200'
      }`}>
        
        {/* Selected Junction Profile */}
        <div className={`flex justify-between items-start border-b pb-4 ${
          theme === 'dark' ? 'border-white/5' : 'border-slate-200'
        }`}>
          <div className="space-y-1">
            <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
              JUNCTION CONTROL BOARD
            </span>
            <h3 className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{activeJunction.name}</h3>
            <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>Simulated Core Grid Nodes</span>
            </p>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest font-mono">Junction Health</span>
            <span className={`text-xl font-black font-mono ${
              activeJunction.health >= 80 ? 'text-emerald-450 text-emerald-400' : activeJunction.health >= 50 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {activeJunction.health}%
            </span>
          </div>
        </div>

        {/* Selected Vehicle Card */}
        {selectedVehicle && (
          <Card variant="glass" className="p-4 border-emerald-500/20 bg-emerald-950/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI OBJECT TRACKING</span>
              </span>
              <button 
                onClick={() => setSelectedVehicle(null)} 
                className="text-[9px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <span className="text-slate-500">OBJECT ID:</span>
              <span className="text-slate-200 font-bold">#{selectedVehicle.id}</span>
              <span className="text-slate-500">CLASSIFICATION:</span>
              <span className="text-slate-200 font-bold uppercase">{selectedVehicle.type}</span>
              <span className="text-slate-500">VELOCITY:</span>
              <span className="text-emerald-400 font-bold">{(selectedVehicle.speed * 18).toFixed(1)} km/h</span>
              <span className="text-slate-500">AI CONFIDENCE:</span>
              <span className="text-sky-400 font-bold">{(94.2 + (selectedVehicle.id % 5)).toFixed(1)}%</span>
              <span className="text-slate-500">PREDICTION:</span>
              <span className="text-slate-350 font-semibold leading-relaxed col-span-2 mt-1 block">
                {selectedVehicle.type === 'ambulance' 
                  ? '⚠ Emergency priority override locked. Path optimization active.'
                  : `Route segment traversal progress: ${Math.round(selectedVehicle.progress * 100)}%. Wipers & headlights active.`}
              </span>
            </div>
          </Card>
        )}

        {/* Manual Actuator Controls */}
        <Card variant="glass" className={`p-4 space-y-4 ${theme === 'dark' ? '' : '!bg-white border-slate-200 shadow-sm'}`}>
          <div className={`flex justify-between items-center border-b pb-2 ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Signal Timers Control</span>
            <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${
              theme === 'dark' ? 'text-emerald-450 bg-slate-900 border-white/5' : 'text-emerald-600 bg-emerald-50 border-emerald-200'
            }`}>
              {junctionTimers[activeJunction.name]?.mode || 'AUTO'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className={`text-[10px] font-extrabold ${theme === 'dark' ? 'text-slate-350' : 'text-slate-800'}`}>
                {junctionTimers[activeJunction.name]?.phase === 'NORTH_SOUTH' ? 'Broadway (N-S)' : '42nd St (E-W)'}
              </span>
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider font-mono mt-1">
                Active green phase
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleSignalPhaseManual(activeJunction.name)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                  theme === 'dark' ? 'border-white/5 bg-slate-900 hover:bg-slate-800 text-slate-200' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Toggle Phase
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            {(['AUTO', 'MANUAL', 'ADAPTIVE'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setJunctionControlMode(activeJunction.name, mode)}
                className={`py-1.5 rounded text-[8px] font-black tracking-wider cursor-pointer border ${
                  (junctionTimers[activeJunction.name]?.mode || 'AUTO') === mode
                    ? theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : theme === 'dark' ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </Card>

        {/* AI Explainability & Recommendation Card */}
        <Card variant="glass" className={`p-4 space-y-3 ${theme === 'dark' ? '' : '!bg-white border-slate-200 shadow-sm'}`}>
          <div className={`flex justify-between items-center border-b pb-2 ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
              AI Recommendation Desk
            </span>
            <span className={`text-[8px] font-black px-2 py-0.5 rounded font-mono border ${
              theme === 'dark' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20' : 'text-emerald-700 bg-emerald-100 border-emerald-300'
            }`}>
              CONFIDENCE: {recCard.confidence}%
            </span>
          </div>
          
          <div className="space-y-2">
            <h4 className={`text-xs font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{recCard.title}</h4>
            <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
              {recCard.reason}
            </p>
            
            <div className="grid grid-cols-2 gap-2 pt-1 text-[8px] font-mono">
              <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block">EXPECTED DELAY RED.</span>
                <span className={`${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} font-bold`}>-{recCard.delayReduction}%</span>
              </div>
              <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block">EST. CO₂ REDUCTION</span>
                <span className={`${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} font-bold`}>-{recCard.co2Reduction}%</span>
              </div>
            </div>
            
            <div className="text-[8px] text-slate-500 font-bold bg-slate-950/40 p-2 rounded border border-white/5 font-mono">
              TRIGGER METRICS: {recCard.triggerMetrics}
            </div>
          </div>
        </Card>

        {/* Before vs After Optimization Statistics */}
        <Card variant="glass" className="p-4 space-y-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
            AI Optimization Delta Summary
          </span>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1 bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
              <span className="text-[8px] font-black text-rose-400 font-mono">BASELINE PRE-AI</span>
              <div className="font-mono text-slate-350 text-[10px]">Health: <span className="font-bold">{stats.baselineHealth}%</span></div>
              <div className="font-mono text-slate-350 text-[10px]">Wait: <span className="font-bold">{stats.baselineWait}s</span></div>
              <div className="font-mono text-slate-350 text-[10px]">Queue: <span className="font-bold">{stats.baselineQueue} veh</span></div>
              <div className="font-mono text-slate-350 text-[10px]">CO₂ Index: <span className="font-bold text-rose-400">+22%</span></div>
            </div>

            <div className="space-y-1 bg-emerald-950/10 p-2.5 rounded-lg border border-emerald-500/10">
              <span className="text-[8px] font-black text-emerald-400 font-mono">AI OPTIMIZED</span>
              <div className="font-mono text-slate-350 text-[10px]">Health: <span className="font-bold text-emerald-450 text-emerald-400">{stats.optHealth}%</span></div>
              <div className="font-mono text-slate-350 text-[10px]">Wait: <span className="font-bold text-emerald-450 text-emerald-400">{stats.optWait}s</span></div>
              <div className="font-mono text-slate-350 text-[10px]">Queue: <span className="font-bold text-emerald-450 text-emerald-400">{stats.optQueue} veh</span></div>
              <div className="font-mono text-slate-350 text-[10px]">CO₂ Index: <span className="font-bold text-emerald-450 text-emerald-400">-{stats.co2Reduction}%</span></div>
            </div>
          </div>
        </Card>

        {/* Traffic Preset Simulators */}
        <div className="space-y-3 border-t border-white/5 pt-4">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
            Incident & Scenario Injector
          </span>

          <select
            value={scenario}
            onChange={(e) => handleScenarioChange(e.target.value as any)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] font-bold text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="normal">Normal Traffic Scenario</option>
            <option value="rush_hour">Rush Hour Peak Load</option>
            <option value="rain">Wet Surface / Rain Mode</option>
            <option value="fog">Low Visibility / Fog Mode</option>
            <option value="accident">Broadway Collision Incident</option>
            <option value="closure">South Expressway Closure</option>
            <option value="construction">Work Zone / Construction</option>
            <option value="vip">VIP Convoy Preemption</option>
            <option value="ambulance">Ambulance Emergency Dispatch</option>
            <option value="fire_truck">Fire Truck Emergency Dispatch</option>
          </select>
        </div>

        {/* Live AI Timeline Step Flow */}
        <div className="space-y-3 flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-wider font-mono">
              {isEmergencyActive ? '🚨 Emergency Corridor Timeline' : 'AI Loop Timeline'}
            </h4>
            <Clock className="h-3.5 w-3.5 text-slate-500" />
          </div>

          {/* Chronological Flow Diagram */}
          <div className="flex flex-col gap-2.5 text-[9px] text-slate-300 font-mono">
            {!isEmergencyActive ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span>1. Vehicle Load Ingress Detected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>2. Congestion Index threshold crossed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>3. AI Queue balancing calculation run</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>4. Optimization timing offsets applied</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-bounce" />
                  <span className="text-emerald-400 font-bold">5. Flow score improved successfully</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                  <span>1. Ambulance Detected (99.4% confidence)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  <span>2. Shortest preemption route computed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  <span>3. Junction Central locked (Broadway GREEN)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-bounce" />
                  <span>4. Conflicting East-West lines stopped</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-450 shrink-0" />
                  <span className="text-rose-400 font-bold">5. Corridor cleared; adaptive restore active</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Emergency Simulator controller actions */}
        <div className="pt-2 border-t border-white/5 flex gap-2">
          <button
            onClick={() => handleScenarioChange(scenario === 'ambulance' ? 'normal' : 'ambulance')}
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              scenario === 'ambulance'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/10'
                : 'bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300'
            }`}
          >
            {scenario === 'ambulance' ? 'Clear Emergency corridor' : 'Trigger Ambulance preemption'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwin;
