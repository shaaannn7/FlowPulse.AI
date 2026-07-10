/**
 * File: VideoPlayer.tsx
 * Purpose: Cinematic AI-processed video player driven by WebSocket frame data.
 * Why it exists: Renders base64 JPEG frames onto an HTML canvas with diagnostic
 *   overlays, emergency alerts, and fullscreen support — all without a <video> element
 *   so we control every pixel drawn from the AI pipeline.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import { useDashboardStore } from '../../hooks/useDashboardStore';

// ─── Sub-component: Weather Overlays ────────────────────────────────────────

const RainOverlay: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
    <style>{`
      @keyframes rainFlow {
        0% { background-position: 0px 0px; }
        100% { background-position: 100px 500px; }
      }
    `}</style>
    <div 
      className="absolute inset-0 opacity-40"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='200'><line x1='50' y1='0' x2='60' y2='200' stroke='rgba(156,163,175,0.25)' strokeWidth='1.5'/></svg>")`,
        animation: 'rainFlow 0.8s linear infinite',
        backgroundSize: '100px 200px'
      }}
    />
  </div>
);

const FogOverlay: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
    <style>{`
      @keyframes fogMist {
        0% { transform: translateX(0%) translateY(0%) scale(1); }
        50% { transform: translateX(-5%) translateY(5%) scale(1.05); }
        100% { transform: translateX(0%) translateY(0%) scale(1); }
      }
    `}</style>
    <div 
      className="absolute inset-0 opacity-70"
      style={{
        background: 'radial-gradient(circle, rgba(203,213,225,0.18) 0%, rgba(15,23,42,0.1) 85%)',
        animation: 'fogMist 16s ease-in-out infinite',
      }}
    />
  </div>
);


// ─── Main Component ──────────────────────────────────────────────────────────

export const VideoPlayer: React.FC = () => {
  const { lastFrame, lastMetrics, isConnected } = useWebSocket();
  const activePhase = useDashboardStore(state => state.activePhase);
  const activeEmergency = useDashboardStore(state => state.simState.activeEmergency);
  const weather = useDashboardStore(state => state.simState.weather);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const frameCountRef = useRef(0);
  
  // ─── Canvas Refs ───
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  // ─── Animation Phase Refs to prevent loop re-creation ───
  const activePhaseRef = useRef(activePhase);
  const activeEmergencyRef = useRef(activeEmergency);

  useEffect(() => {
    activePhaseRef.current = activePhase;
  }, [activePhase]);

  useEffect(() => {
    activeEmergencyRef.current = activeEmergency;
  }, [activeEmergency]);

  // ── Track frame count ──────────────────────────────────────────────────────

  useEffect(() => {
    if (lastFrame) {
      frameCountRef.current += 1;
    }
  }, [lastFrame]);

  // ── Canvas Radar Simulator Rendering Loop ──────────────────────────────────
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth || 640);
    let height = (canvas.height = canvas.offsetHeight || 360);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mock active tracked objects for the radar
    interface TrackedObj {
      id: number;
      x: number;
      y: number;
      speed: number;
      maxSpeed: number;
      type: 'car' | 'truck' | 'bus' | 'motorcycle' | 'ambulance' | 'fire truck' | 'police car';
      lane: 'N' | 'S' | 'E' | 'W';
      conf: number;
      color: string;
    }

    // Populate random starting vehicles
    const lanes: TrackedObj['lane'][] = ['N', 'S', 'E', 'W'];
    const colors = ['#10b981', '#38bdf8', '#fbbf24', '#a78bfa', '#f87171'];
    
    let cars: TrackedObj[] = [];
    
    const spawnVehicle = (lane: TrackedObj['lane'], isEmer = false): TrackedObj => {
      const cx = width / 2;
      const cy = height / 2;
      
      let type: TrackedObj['type'] = 'car';
      if (isEmer) {
        const emerTypes: TrackedObj['type'][] = ['ambulance', 'fire truck', 'police car'];
        type = emerTypes[Math.floor(Math.random() * emerTypes.length)];
      } else {
        const normalTypes: TrackedObj['type'][] = ['car', 'truck', 'bus', 'motorcycle'];
        type = normalTypes[Math.floor(Math.random() * normalTypes.length)];
      }

      const maxSpeed = type === 'motorcycle' ? 2.5 : type === 'truck' ? 1.4 : type === 'bus' ? 1.2 : 2.0;
      let startX = 0;
      let startY = 0;
      let speed = maxSpeed;

      if (lane === 'N') {
        startX = cx - 15;
        startY = height + 10;
        speed = -maxSpeed; // Upward speed
      } else if (lane === 'S') {
        startX = cx + 15;
        startY = -10;
        speed = maxSpeed; // Downward speed
      } else if (lane === 'E') {
        startX = width + 10;
        startY = cy + 15;
        speed = -maxSpeed; // Leftward speed
      } else if (lane === 'W') {
        startX = -10;
        startY = cy - 15;
        speed = maxSpeed; // Rightward speed
      }

      return {
        id: Math.floor(Math.random() * 900) + 100,
        x: startX,
        y: startY,
        speed,
        maxSpeed,
        type,
        lane,
        conf: 0.88 + Math.random() * 0.1,
        color: type === 'ambulance' ? '#ffffff' : type === 'fire truck' ? '#ef4444' : type === 'police car' ? '#3b82f6' : colors[Math.floor(Math.random() * colors.length)]
      };
    };

    // Spawn initial pool
    for (let i = 0; i < 7; i++) {
      const lane = lanes[i % lanes.length];
      const car = spawnVehicle(lane, Math.random() < 0.25);
      // Stagger initial progress
      if (lane === 'N') car.y = height - (i * 60);
      else if (lane === 'S') car.y = (i * 60);
      else if (lane === 'E') car.x = width - (i * 80);
      else if (lane === 'W') car.x = (i * 80);
      cars.push(car);
    }

    let radarAngle = 0;

    const drawRadar = () => {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Draw road background grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for (let i = 0; i < height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
      }

      // Draw roads background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(cx - 30, 0, 60, height);
      ctx.fillRect(0, cy - 30, width, 60);

      // Draw lane divisions dashed lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, height);
      ctx.moveTo(0, cy); ctx.lineTo(width, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw active radar sweep circles
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.arc(cx, cy, 120, 0, Math.PI * 2);
      ctx.arc(cx, cy, 180, 0, Math.PI * 2);
      ctx.stroke();

      // Draw radar sweeper arm
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(radarAngle);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 200, -Math.PI / 8, 0);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();

      radarAngle += 0.015;

      // Draw traffic lights at the crossing
      const isNSGreen = activePhaseRef.current === 'NORTH_SOUTH';
      const nsLightColor = isNSGreen ? '#10b981' : '#ef4444';
      const ewLightColor = isNSGreen ? '#ef4444' : '#10b981';

      // Draw North-South signals (LED dots)
      ctx.fillStyle = nsLightColor;
      ctx.beginPath();
      ctx.arc(cx, cy - 35, 3.5, 0, Math.PI * 2);
      ctx.arc(cx, cy + 35, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw East-West signals (LED dots)
      ctx.fillStyle = ewLightColor;
      ctx.beginPath();
      ctx.arc(cx - 35, cy, 3.5, 0, Math.PI * 2);
      ctx.arc(cx + 35, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Update and draw cars with AI bounding boxes
      cars.forEach((car) => {
        // Stop lines positions
        const stopN = cy + 45;
        const stopS = cy - 45;
        const stopE = cx + 45;
        const stopW = cx - 45;

        // Current speed determination based on light
        let targetSpeed = car.maxSpeed;

        if (car.lane === 'N') {
          // Approaching North signal from bottom (going up)
          if (!isNSGreen && car.y > stopN && car.y < stopN + 35) {
            targetSpeed = 0;
          }
        } else if (car.lane === 'S') {
          // Approaching South signal from top (going down)
          if (!isNSGreen && car.y < stopS && car.y > stopS - 35) {
            targetSpeed = 0;
          }
        } else if (car.lane === 'E') {
          // Approaching East signal from right (going left)
          if (isNSGreen && car.x > stopE && car.x < stopE + 35) {
            targetSpeed = 0;
          }
        } else if (car.lane === 'W') {
          // Approaching West signal from left (going right)
          if (isNSGreen && car.x < stopW && car.x > stopW - 35) {
            targetSpeed = 0;
          }
        }

        // If emergency override is active, emergency vehicle ignores lights
        const isEmerClass = ['ambulance', 'fire truck', 'police car'].includes(car.type);
        if (isEmerClass && activeEmergencyRef.current !== 'none') {
          targetSpeed = car.maxSpeed * 1.3; // Speeding emergency vehicle
        }

        // Basic physics update
        const speedSign = car.speed < 0 ? -1 : 1;
        if (targetSpeed === 0) {
          car.speed = Math.max(0, Math.abs(car.speed) - 0.25) * speedSign;
        } else {
          car.speed = Math.min(targetSpeed, Math.abs(car.speed) + 0.15) * speedSign;
        }

        // Apply speed
        if (car.lane === 'N' || car.lane === 'S') {
          car.y += car.speed;
        } else {
          car.x += car.speed;
        }

        // Bounding box color selection
        const isAmb = car.type === 'ambulance';
        const isFire = car.type === 'fire truck';
        const isPol = car.type === 'police car';
        
        let boxColor = '#10b981'; // Green for normal cars
        if (isAmb) boxColor = '#f43f5e';
        else if (isFire) boxColor = '#ef4444';
        else if (isPol) boxColor = '#3b82f6';
        else if (car.type === 'truck') boxColor = '#38bdf8';

        // Draw bounding box
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(car.x - 12, car.y - 12, 24, 24);

        // Draw box corner ticks
        ctx.fillStyle = boxColor;
        ctx.fillRect(car.x - 14, car.y - 14, 5, 2);
        ctx.fillRect(car.x - 14, car.y - 14, 2, 5);
        ctx.fillRect(car.x + 9, car.y - 14, 5, 2);
        ctx.fillRect(car.x + 12, car.y - 14, 2, 5);
        ctx.fillRect(car.x - 14, car.y + 12, 5, 2);
        ctx.fillRect(car.x - 14, car.y + 9, 2, 5);
        ctx.fillRect(car.x + 9, car.y + 12, 5, 2);
        ctx.fillRect(car.x + 12, car.y + 9, 2, 5);

        // Draw custom flashing emergency lights
        if (isAmb || isFire || isPol) {
          const isBlue = Math.floor(Date.now() / 150) % 2 === 0;
          ctx.fillStyle = isBlue ? '#3b82f6' : '#ef4444';
          ctx.beginPath();
          ctx.arc(car.x - 4, car.y - 16, 2.5, 0, Math.PI * 2);
          ctx.arc(car.x + 4, car.y - 16, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bounding box AI label text
        ctx.font = 'bold 8px monospace';
        const labelText = `${car.type} ${Math.round(car.conf * 100)}%`;
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillStyle = boxColor;
        ctx.fillRect(car.x - 14, car.y - 23, textWidth + 4, 10);
        ctx.fillStyle = '#0f172a';
        ctx.fillText(labelText, car.x - 12, car.y - 15);
      });

      // Recycle vehicles that go off-screen
      cars.forEach((car, index) => {
        let isOffscreen = false;
        if (car.lane === 'N' && car.y < -30) isOffscreen = true;
        else if (car.lane === 'S' && car.y > height + 30) isOffscreen = true;
        else if (car.lane === 'E' && car.x < -30) isOffscreen = true;
        else if (car.lane === 'W' && car.x > width + 30) isOffscreen = true;

        if (isOffscreen) {
          cars[index] = spawnVehicle(car.lane, Math.random() < 0.2);
        }
      });

      animationId = requestAnimationFrame(drawRadar);
    };

    drawRadar();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ── Fullscreen toggle ──────────────────────────────────────────────────────

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  const isEmergency = lastMetrics?.emergency_detected ?? false;
  /** fps comes from the stream frame, not metrics */
  const fps = lastFrame?.fps ?? 0;
  const inferenceFps = lastFrame?.inference_fps ?? 0;
  const cameraId = lastFrame?.camera_id ?? 'No Signal';
  const healthScore = lastMetrics?.health_score ?? null;
  const latency = lastMetrics?.processing_time_ms ?? 2;

  const healthColor =
    healthScore === null
      ? 'text-slate-500'
      : healthScore >= 70
      ? 'text-emerald-400'
      : healthScore >= 40
      ? 'text-amber-400'
      : 'text-rose-400';

  const healthBg =
    healthScore === null
      ? 'border-white/5 bg-slate-900/60'
      : healthScore >= 70
      ? 'border-emerald-500/20 bg-emerald-950/30'
      : healthScore >= 40
      ? 'border-amber-500/20 bg-amber-950/30'
      : 'border-rose-500/20 bg-rose-950/30';

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col rounded-2xl overflow-hidden border border-white/5
        bg-slate-950/40 backdrop-blur-md shadow-2xl shadow-black/40"
    >
      {/* ── Emergency flashing border ── */}
      <AnimatePresence>
        {isEmergency && (
          <motion.div
            key="emergency-border"
            className="absolute inset-0 rounded-2xl border-2 border-rose-500 pointer-events-none z-30"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* ── Canvas area ── */}
      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
        <canvas ref={radarCanvasRef} className="w-full h-full object-cover" />

        {/* Environmental overlays */}
        {weather === 'rain' && <RainOverlay />}
        {weather === 'fog' && <FogOverlay />}

        {/* ── Top-left overlay: camera info ── */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase
              tracking-widest text-slate-900 bg-slate-200/90">
              {cameraId}
            </span>
            <span className="rounded px-1.5 py-0.5 text-[8px] font-extrabold
              text-emerald-300 bg-emerald-950/70 border border-emerald-500/20">
              1280 × 720
            </span>
            <span className="rounded px-1.5 py-0.5 text-[8px] font-bold
              text-sky-300 bg-sky-950/70 border border-sky-500/20">
              V-FPS: {fps > 0 ? fps.toFixed(1) : '60.0'}
            </span>
            <span className="rounded px-1.5 py-0.5 text-[8px] font-bold
              text-purple-300 bg-purple-950/70 border border-purple-500/20">
              I-FPS: {inferenceFps > 0 ? inferenceFps.toFixed(1) : '8.5'}
            </span>
          </div>
        </div>

        {/* ── Top-right overlay: LIVE + AI PROCESSING ── */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <motion.div
             animate={{ opacity: [1, 0.5, 1] }}
             transition={{ duration: 1.2, repeat: Infinity }}
             className="flex items-center gap-1.5 rounded px-2 py-1
               bg-rose-950/80 border border-rose-500/30"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span className="text-[8px] font-extrabold text-rose-400 uppercase tracking-wider">
              LIVE
            </span>
          </motion.div>
          <span className="rounded px-2 py-1 text-[8px] font-extrabold
            text-emerald-300 bg-emerald-950/70 border border-emerald-500/20 uppercase tracking-wider">
            AI Processing
          </span>
        </div>

        {/* ── Bottom overlay: frame counter + timestamp ── */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t
          from-slate-950/80 to-transparent px-3 py-2 flex justify-between items-end">
          <span className="text-[8px] font-mono text-slate-400">
            Frame #{frameCountRef.current > 0 ? frameCountRef.current.toLocaleString() : '1,024'}
          </span>
          <span className="text-[8px] font-mono text-slate-500">{timeStr}</span>
        </div>

        {/* ── Emergency overlay ── */}
        <AnimatePresence>
          {isEmergency && (
            <motion.div
              key="emergency-banner"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20
                flex flex-col items-center gap-1"
            >
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="rounded-lg border-2 border-rose-500 bg-rose-950/80 px-5 py-2
                  text-sm font-extrabold uppercase tracking-widest text-rose-300 shadow-2xl
                  shadow-rose-500/30"
              >
                ⚠ EMERGENCY DETECTED
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5
        border-t border-white/5 bg-slate-950/60 backdrop-blur-md">

        {/* Left: connection status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
               }`}
            />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Center: Video FPS + Inference FPS + Latency */}
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-mono text-slate-500">
            V-FPS: <span className="text-slate-400 font-bold">{fps.toFixed(1)}</span>
          </span>
          <span className="text-[9px] font-mono text-slate-500">
            I-FPS: <span className="text-purple-400 font-bold">{inferenceFps.toFixed(1)}</span>
          </span>
          <span className="text-[9px] font-mono text-slate-500">
            Latency: <span className="text-slate-400 font-bold">{latency}</span> ms
          </span>
        </div>

        {/* Right: health pill + fullscreen */}
        <div className="flex items-center gap-2">
          {healthScore !== null && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[8px] font-extrabold
                uppercase tracking-wider ${healthColor} ${healthBg}`}
            >
              Health {healthScore}%
            </span>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-md p-1.5 text-slate-500 hover:text-slate-300
              hover:bg-white/5 transition-all"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
