import React, { useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { Navigation, Map, AlertTriangle } from 'lucide-react';

interface Vehicle {
  id: number;
  type: 'car' | 'bus' | 'truck' | 'ambulance';
  lane: 'N' | 'S' | 'E' | 'W';
  x: number;
  y: number;
  speed: number;
  maxSpeed: number;
  length: number;
  width: number;
  color: string;
}

export const InteractiveCityMap: React.FC = () => {
  const activePhase = useDashboardStore(state => state.activePhase);
  const activeEmergency = useDashboardStore(state => state.simState.activeEmergency);
  const weather = useDashboardStore(state => state.simState.weather);
  const trafficLoad = useDashboardStore(state => state.simState.trafficLoad);
  const triggerEmergency = useDashboardStore(state => state.triggerEmergency);
  const setTrafficLoad = useDashboardStore(state => state.setTrafficLoad);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const frameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  const isNS = activePhase === 'NORTH_SOUTH';
  const isEmergency = activeEmergency !== 'none';
  const isRain = weather === 'rain';
  
  // Dimensions
  const canvasW = 400;
  const canvasH = 280;
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const roadWidth = 44;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const spawnVehicle = (forceAmbulance: boolean = false) => {
      const types = ['car', 'car', 'car', 'truck', 'bus'];
      const type = forceAmbulance ? 'ambulance' : types[Math.floor(Math.random() * types.length)] as any;
      
      const lanes = ['N', 'S', 'E', 'W'] as const;
      const lane = forceAmbulance ? 'N' : lanes[Math.floor(Math.random() * lanes.length)];
      
      let x = 0, y = 0;
      const offset = 10;

      if (lane === 'N') { x = cx - offset; y = canvasH + 20; } // Going UP
      if (lane === 'S') { x = cx + offset; y = -20; }          // Going DOWN
      if (lane === 'E') { x = -20; y = cy + offset; }          // Going RIGHT
      if (lane === 'W') { x = canvasW + 20; y = cy - offset; } // Going LEFT

      let color = '#38bdf8';
      let length = 12;
      let width = 6;
      let maxSpeed = 1.2;

      if (type === 'truck') { color = '#94a3b8'; length = 18; width = 7; maxSpeed = 0.8; }
      if (type === 'bus') { color = '#fbbf24'; length = 20; width = 7; maxSpeed = 0.7; }
      if (type === 'ambulance') { color = '#f43f5e'; length = 14; width = 6; maxSpeed = 2.5; }

      // Adjust for weather
      if (isRain && type !== 'ambulance') maxSpeed *= 0.7;

      vehiclesRef.current.push({
        id: Math.random(), type, lane, x, y, speed: maxSpeed, maxSpeed, length, width, color
      });
    };

    const updatePhysics = () => {
      frameRef.current++;
      
      // Spawn logic
      const spawnRate = trafficLoad === 'heavy' ? 40 : 90;
      if (frameRef.current - lastSpawnRef.current > spawnRate) {
        spawnVehicle();
        lastSpawnRef.current = frameRef.current;
      }

      // Check if we need to spawn an ambulance
      const hasAmbulance = vehiclesRef.current.some(v => v.type === 'ambulance');
      if (isEmergency && !hasAmbulance) {
        spawnVehicle(true);
      }

      // Intersection stop lines
      const stopN = cy + roadWidth / 2 + 5;
      const stopS = cy - roadWidth / 2 - 5;
      const stopE = cx - roadWidth / 2 - 5;
      const stopW = cx + roadWidth / 2 + 5;

      const safeDist = isRain ? 25 : 15;

      for (let i = 0; i < vehiclesRef.current.length; i++) {
        const v = vehiclesRef.current[i];
        
        // Find vehicle ahead
        let vehicleAhead: Vehicle | null = null;
        let minDist = Infinity;
        
        for (let j = 0; j < vehiclesRef.current.length; j++) {
          if (i === j) continue;
          const other = vehiclesRef.current[j];
          if (other.lane === v.lane) {
            let dist = -1;
            if (v.lane === 'N' && other.y < v.y) dist = v.y - other.y;
            if (v.lane === 'S' && other.y > v.y) dist = other.y - v.y;
            if (v.lane === 'E' && other.x > v.x) dist = other.x - v.x;
            if (v.lane === 'W' && other.x < v.x) dist = v.x - other.x;
            
            if (dist > 0 && dist < minDist) {
              minDist = dist;
              vehicleAhead = other;
            }
          }
        }

        let targetSpeed = v.maxSpeed;

        // Collision avoidance
        if (minDist < safeDist) {
          targetSpeed = vehicleAhead ? vehicleAhead.speed * 0.8 : 0;
          if (minDist < v.length + 2) targetSpeed = 0;
        }

        // Intersection logic (Red light)
        const isRed = (v.lane === 'N' || v.lane === 'S') ? !isNS : isNS;
        // If it's an ambulance, it blows through red lights (or the corridor makes it green)
        const mustStop = isRed && v.type !== 'ambulance';

        if (mustStop) {
          let distToStop = Infinity;
          if (v.lane === 'N' && v.y > stopN) distToStop = v.y - stopN;
          if (v.lane === 'S' && v.y < stopS) distToStop = stopS - v.y;
          if (v.lane === 'E' && v.x < stopE) distToStop = stopE - v.x;
          if (v.lane === 'W' && v.x > stopW) distToStop = v.x - stopW;

          if (distToStop > 0 && distToStop < 40) {
            targetSpeed = Math.min(targetSpeed, (distToStop / 40) * v.maxSpeed);
            if (distToStop < 5) targetSpeed = 0;
          }
        }

        // Accelerate or brake
        if (v.speed < targetSpeed) v.speed += 0.05;
        if (v.speed > targetSpeed) v.speed -= 0.1;
        if (v.speed < 0) v.speed = 0;

        // Move
        if (v.lane === 'N') v.y -= v.speed;
        if (v.lane === 'S') v.y += v.speed;
        if (v.lane === 'E') v.x += v.speed;
        if (v.lane === 'W') v.x -= v.speed;
      }

      // Remove off-screen vehicles
      vehiclesRef.current = vehiclesRef.current.filter(
        v => v.x > -50 && v.x < canvasW + 50 && v.y > -50 && v.y < canvasH + 50
      );
    };

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvasW, canvasH);
      
      // Draw roads
      ctx.fillStyle = isRain ? '#040507' : '#0d0e14';
      ctx.fillRect(0, cy - roadWidth/2, canvasW, roadWidth); // Horiz
      ctx.fillRect(cx - roadWidth/2, 0, roadWidth, canvasH); // Vert

      // Center intersection box
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - roadWidth/2, cy - roadWidth/2, roadWidth, roadWidth);

      // Dash lines
      ctx.strokeStyle = '#1e293b';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(canvasW, cy);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, canvasH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Green Corridor
      if (isEmergency) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.1)';
        ctx.fillRect(cx - roadWidth/2, 0, roadWidth/2, canvasH);
        
        ctx.strokeStyle = '#f43f5e';
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -frameRef.current;
        ctx.strokeRect(cx - roadWidth/2, 0, roadWidth/2, canvasH);
        ctx.setLineDash([]);
      }

      // Draw vehicles
      for (const v of vehiclesRef.current) {
        ctx.save();
        ctx.translate(v.x, v.y);
        
        // Rotation
        if (v.lane === 'E') ctx.rotate(Math.PI / 2);
        if (v.lane === 'W') ctx.rotate(-Math.PI / 2);
        if (v.lane === 'S') ctx.rotate(Math.PI);

        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-v.width/2 + 2, -v.length/2 + 2, v.width, v.length);

        // Draw body
        ctx.fillStyle = v.color;
        ctx.fillRect(-v.width/2, -v.length/2, v.width, v.length);

        // Emergency strobe
        if (v.type === 'ambulance') {
          if (Math.floor(frameRef.current / 5) % 2 === 0) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(-v.width/2, -v.length/2, v.width, 3);
            
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // Draw traffic lights
      const drawLight = (x: number, y: number, isGreen: boolean) => {
        ctx.fillStyle = isGreen ? '#10b981' : '#f43f5e';
        ctx.shadowColor = isGreen ? '#10b981' : '#f43f5e';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      };

      drawLight(cx - 12, cy - roadWidth/2 - 10, isNS);
      drawLight(cx + 12, cy + roadWidth/2 + 10, isNS);
      drawLight(cx - roadWidth/2 - 10, cy + 12, !isNS);
      drawLight(cx + roadWidth/2 + 10, cy - 12, !isNS);
    };

    const loop = () => {
      updatePhysics();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [isNS, isEmergency, isRain, trafficLoad]);

  return (
    <Card variant="glass" className="flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="flex justify-between items-center border-b border-white/5 pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-emerald-450" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Interactive Digital Twin 2.0</h3>
            <p className="text-[9px] text-slate-500 font-bold font-mono mt-0.5">Hardware-accelerated physics engine</p>
          </div>
        </div>
        {isEmergency && (
          <span className="flex items-center gap-1 text-[8px] font-black text-rose-400 bg-rose-950/40 border border-rose-500/25 px-2 py-0.5 rounded-full font-mono animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            <span>CORRIDOR ACTIVE</span>
          </span>
        )}
      </div>

      <div className="relative aspect-[4/3] w-full bg-slate-950/60 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden p-2">
        {isRain && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 opacity-20" style={{ background: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'200\'><line x1=\'50\' y1=\'0\' x2=\'55\' y2=\'200\' stroke=\'white\' strokeWidth=\'1\'/></svg>")', backgroundSize: '50px 100px', animation: 'mapRainFlow 0.8s linear infinite' }} />
        )}
        <canvas ref={canvasRef} width={canvasW} height={canvasH} className="w-full h-full rounded-xl pointer-events-none" style={{ imageRendering: 'pixelated' }} />
        
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[8px] font-mono text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded border border-white/5">
          <Navigation className="h-3 w-3 rotate-45 text-slate-500" />
          <span>GRID CENTRAL</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1 relative z-10">
        <button
          onClick={() => triggerEmergency(isEmergency ? 'none' : 'ambulance')}
          className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
            isEmergency ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          {isEmergency ? 'Clear Corridor' : 'Simulate Emergency'}
        </button>
        <button
          onClick={() => setTrafficLoad(trafficLoad === 'heavy' ? 'normal' : 'heavy')}
          className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
            trafficLoad === 'heavy' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          {trafficLoad === 'heavy' ? 'Clear Congestion' : 'Simulate Rush Hour'}
        </button>
      </div>
    </Card>
  );
};

export default InteractiveCityMap;
