/**
 * File: CameraGrid.tsx
 * Purpose: Camera Stream grid display.
 * Why it exists: Combines live video feeds and overlays canvas telemetry lines, bounding boxes, and FPS counts.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { useModal } from '../../context/ModalContext';
import { Maximize2, AlertOctagon } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';

interface CameraItem {
  id: string;
  name: string;
  lane: string;
  density: number;
  vehicles: number;
  status: 'STREAMING' | 'DISCONNECTED';
}

export const CameraGrid: React.FC = () => {
  // Select primitive Zustand values to avoid unnecessary re-renders
  const showBoundingBoxes = useDashboardStore(state => state.devSettings.showBoundingBoxes);
  const showLaneLines = useDashboardStore(state => state.devSettings.showLaneLines);
  const showDetectionLabels = useDashboardStore(state => state.devSettings.showDetectionLabels);
  const showFps = useDashboardStore(state => state.devSettings.showFps);
  const activeEmergency = useDashboardStore(state => state.simState.activeEmergency);

  const { openModal } = useModal();
  const { lastFrame } = useWebSocket();
  const [cameras] = useState<CameraItem[]>([
    { id: 'cam_north_01', name: 'Camera North', lane: 'Northbound Lane', density: 0.15, vehicles: 2, status: 'STREAMING' },
    { id: 'cam_south_01', name: 'Camera South', lane: 'Southbound Lane', density: 0.22, vehicles: 3, status: 'STREAMING' },
    { id: 'cam_east_01', name: 'Camera East', lane: 'Eastbound Lane', density: 0.08, vehicles: 1, status: 'STREAMING' },
    { id: 'cam_west_01', name: 'Camera West', lane: 'Westbound Lane', density: 0.12, vehicles: 1, status: 'STREAMING' },
  ]);

  const canvasRefs = {
    cam_north_01: useRef<HTMLCanvasElement>(null),
    cam_south_01: useRef<HTMLCanvasElement>(null),
    cam_east_01: useRef<HTMLCanvasElement>(null),
    cam_west_01: useRef<HTMLCanvasElement>(null),
  };

  // Keep latest state parameters in Refs for thread-safe access in single draw loop
  const showBoundingBoxesRef = useRef(showBoundingBoxes);
  const showLaneLinesRef = useRef(showLaneLines);
  const showDetectionLabelsRef = useRef(showDetectionLabels);
  const showFpsRef = useRef(showFps);
  const activeEmergencyRef = useRef(activeEmergency);
  const lastFrameRef = useRef(lastFrame);

  // Keep references updated on render
  useEffect(() => {
    showBoundingBoxesRef.current = showBoundingBoxes;
    showLaneLinesRef.current = showLaneLines;
    showDetectionLabelsRef.current = showDetectionLabels;
    showFpsRef.current = showFps;
    activeEmergencyRef.current = activeEmergency;
    lastFrameRef.current = lastFrame;
  }, [showBoundingBoxes, showLaneLines, showDetectionLabels, showFps, activeEmergency, lastFrame]);

  // Load image frame on background image elements to avoid re-instantiations
  const liveImgRef = useRef<HTMLImageElement | null>(null);
  const lastDrawnFrameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!liveImgRef.current) {
      liveImgRef.current = new Image();
    }
  }, []);

  // Update image source only when frame data actually changes
  useEffect(() => {
    if (lastFrame?.frame && lastFrame.frame !== lastDrawnFrameRef.current) {
      if (liveImgRef.current) {
        liveImgRef.current.src = `data:image/jpeg;base64,${lastFrame.frame}`;
        lastDrawnFrameRef.current = lastFrame.frame;
      }
    }
  }, [lastFrame]);

  // Single continuous Canvas draw loop initialized exactly once on mount
  useEffect(() => {
    let animationFrameId: number;

    const simulatedOffsets: Record<string, number[]> = {
      cam_north_01: [40, 120, 220],
      cam_south_01: [90, 190],
      cam_east_01: [150],
      cam_west_01: [80, 240],
    };

    const timeSec = () => Math.floor(Date.now() / 250);

    const drawOverlay = (ctx: CanvasRenderingContext2D, _w: number, _h: number, _cid: string) => {
      if (showFpsRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(5, 5, 45, 16);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('15 FPS', 9, 16);
      }
    };

    const render = () => {
      // Pause drawing completely when page is hidden to save CPU/GPU resources
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      Object.entries(canvasRefs).forEach(([cid, ref]) => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // NORTH camera has WebSocket stream source available
        if (cid === 'cam_north_01' && lastFrameRef.current && liveImgRef.current && liveImgRef.current.complete) {
          ctx.drawImage(liveImgRef.current, 0, 0, canvas.width, canvas.height);
          drawOverlay(ctx, canvas.width, canvas.height, cid);
          return;
        }

        // Default/Offline mock rendering loops
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Road lanes
        if (showLaneLinesRef.current) {
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2, 0);
          ctx.lineTo(canvas.width / 2, canvas.height);
          ctx.stroke();

          // Dash lane indicators
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.setLineDash([5, 10]);
          ctx.beginPath();
          ctx.moveTo(canvas.width / 4, 0);
          ctx.lineTo(canvas.width / 4, canvas.height);
          ctx.moveTo((canvas.width * 3) / 4, 0);
          ctx.lineTo((canvas.width * 3) / 4, canvas.height);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw moving vehicles
        const offsets = simulatedOffsets[cid];
        const isEmergencyActive = activeEmergencyRef.current !== 'none' && cid === 'cam_north_01';

        offsets.forEach((y, idx) => {
          let nextY = y + 0.8;
          if (nextY > canvas.height) nextY = -30;
          offsets[idx] = nextY;

          // Draw vehicle box
          const x = canvas.width / 2 - 20;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.fillRect(x, nextY, 40, 30);

          if (showBoundingBoxesRef.current) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, nextY, 40, 30);
          }

          if (showDetectionLabelsRef.current) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`car #${idx + 1}`, x, nextY - 4);
          }
        });

        // If emergency approach is simulated
        if (isEmergencyActive) {
          const x = canvas.width / 2 - 20;
          const y = (timeSec() * 80) % canvas.height;

          ctx.fillStyle = timeSec() % 2 === 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)';
          ctx.fillRect(x, y, 40, 30);

          if (showBoundingBoxesRef.current) {
            ctx.strokeStyle = timeSec() % 2 === 0 ? '#ef4444' : '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, 40, 30);
          }

          if (showDetectionLabelsRef.current) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('EMERGENCY', x, y - 4);
          }
        }

        drawOverlay(ctx, canvas.width, canvas.height, cid);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleExpandCamera = (cam: CameraItem) => {
    openModal({
      title: `${cam.name} - Fullscreen Diagnostics`,
      size: 'lg',
      content: (
        <div className="space-y-4">
          <div className="aspect-video w-full bg-black/60 rounded-xl relative overflow-hidden flex items-center justify-center border border-white/5">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Full Stream Telemetry Render active</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-slate-900 border border-white/5 p-3">
              <h5 className="text-[10px] text-slate-500 uppercase font-bold">Vehicle Count</h5>
              <p className="text-sm font-extrabold text-slate-200 mt-1">{cam.vehicles}</p>
            </div>
            <div className="rounded-lg bg-slate-900 border border-white/5 p-3">
              <h5 className="text-[10px] text-slate-500 uppercase font-bold">Density Score</h5>
              <p className="text-sm font-extrabold text-slate-200 mt-1">{(cam.density * 100).toFixed(0)}%</p>
            </div>
            <div className="rounded-lg bg-slate-900 border border-white/5 p-3">
              <h5 className="text-[10px] text-slate-500 uppercase font-bold">Latency</h5>
              <p className="text-sm font-extrabold text-emerald-450 mt-1">12ms</p>
            </div>
          </div>
        </div>
      ),
    });
  };

  const isEmergency = activeEmergency !== 'none';

  return (
    <div className="grid grid-cols-2 gap-5">
      {cameras.map((cam) => {
        const isEmergencyActive = isEmergency && cam.id === 'cam_north_01';
        return (
          <Card key={cam.id} variant="glass" className="flex flex-col gap-3 group relative overflow-hidden">
            {/* Header info */}
            <div className="flex justify-between items-center z-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-200">{cam.name}</span>
                <span className="text-[9px] text-slate-550 font-semibold">{cam.lane}</span>
              </div>
              <div className="flex items-center gap-2">
                {isEmergencyActive && (
                  <span className="flex items-center gap-1 text-[8px] font-extrabold text-rose-455 bg-rose-950/40 border border-rose-500/25 px-1.5 py-0.5 rounded animate-pulse">
                    <AlertOctagon className="h-2.5 w-2.5" />
                    EMERGENCY
                  </span>
                )}
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <button
                  onClick={() => handleExpandCamera(cam)}
                  className="rounded p-1 hover:bg-white/5 text-slate-500 hover:text-slate-350 transition-colors"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Video Canvas viewport */}
            <div className="aspect-video w-full rounded-xl bg-black/60 relative overflow-hidden border border-white/5">
              <canvas
                ref={(canvasRefs as any)[cam.id]}
                width={320}
                height={180}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
};
export default CameraGrid;
