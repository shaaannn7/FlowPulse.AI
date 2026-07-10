/**
 * File: LiveMetricsPanel.tsx
 * Purpose: Real-time AI analytics panel fed by WebSocket metrics stream.
 * Why it exists: Surfaces congestion, health, vehicle count, and lane queue
 *   metrics in a single dense panel without requiring page navigation.
 *   Uses only fields present on MetricsUpdateData from shared/types.ts.
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts';
import { Activity, Layers } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import { Card } from '../ui/Card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryPoint {
  t: number;
  health: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-slate-800/60 ${className}`} />
);

// ─── Animated counter ─────────────────────────────────────────────────────────

const AnimatedValue: React.FC<{ value: number | string; className?: string }> = ({
  value,
  className = '',
}) => (
  <motion.span
    key={String(value)}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className={className}
  >
    {value}
  </motion.span>
);

// ─── Lane queue bar ───────────────────────────────────────────────────────────

interface LaneBarProps {
  lane: string;
  queueLength: number;
  avgWaitSec: number;
  /** Max queue length for relative scaling */
  maxQueue: number;
}

const LaneBar: React.FC<LaneBarProps> = ({ lane, queueLength, avgWaitSec, maxQueue }) => {
  const pct = maxQueue > 0 ? Math.min(100, Math.round((queueLength / maxQueue) * 100)) : 0;
  const color = pct >= 80 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {lane}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-500">{avgWaitSec.toFixed(0)}s wait</span>
          <span className="text-[9px] font-mono text-slate-400">{queueLength} vehs</span>
        </div>
      </div>
      <div className="h-1 w-full rounded-full bg-slate-800/60 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className={`rounded-lg border px-2 py-1.5 text-[9px] transition-all duration-[800ms] ${
      isDark 
        ? 'border-white/5 bg-slate-900/95 text-slate-300' 
        : 'border-slate-200 bg-white/95 text-slate-800 shadow-sm'
    }`}>
      Health: <span className="font-bold text-emerald-500 dark:text-emerald-400">{val}%</span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const LiveMetricsPanel: React.FC = () => {
  const { lastMetrics, isConnected } = useWebSocket();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const historyRef = useRef<HistoryPoint[]>([]);

  // Maintain a rolling 30-point health-score history
  useEffect(() => {
    if (!lastMetrics) return;
    const health = Math.max(0, Math.min(100, Math.round(100 - lastMetrics.congestion_score)));
    historyRef.current = [
      ...historyRef.current.slice(-29),
      { t: Date.now(), health },
    ];
  }, [lastMetrics]);

  // ── Derived values ────────────────────────────────────────────────────────

  const m = lastMetrics;
  const health = m ? Math.max(0, Math.min(100, Math.round(100 - m.congestion_score))) : null;
  const congestionPct = m ? Math.round(m.congestion_score) : null;
  const healthColor =
    health === null
      ? 'text-slate-400'
      : health >= 70
      ? 'text-emerald-400'
      : health >= 40
      ? 'text-amber-400'
      : 'text-rose-400';

  // Extract lane data from the `lanes` Record<string, LaneMetric>
  const laneEntries = m && m.lanes ? Object.entries(m.lanes) : [];
  const maxQueue = laneEntries.reduce((acc, [, v]) => Math.max(acc, v.queue_length), 1);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Card variant="glass" className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">
            Live Metrics
          </h3>
          <p className="text-[9px] text-slate-500 mt-0.5 font-semibold">
            Real-time AI analytics
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="text-[9px] font-bold text-slate-500">
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {/* ── Emergency badge ── */}
      <AnimatePresence>
        {m?.emergency_detected && (
          <motion.div
            key="emergency"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 rounded-lg border border-rose-500/30
              bg-rose-950/30 px-3 py-2"
          >
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="h-2 w-2 rounded-full bg-rose-500 flex-shrink-0"
            />
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-400">
              Emergency Active
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stat cards grid ── */}
      <div className="grid grid-cols-2 gap-2">
        {/* Total vehicles */}
        <div className={`rounded-xl border p-3 transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-200/80 bg-slate-100/50'
        }`}>
          {m ? (
            <>
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Total Vehicles
              </p>
              <AnimatedValue
                value={m.total_count}
                className={`text-lg font-extrabold block mt-1 transition-colors duration-[800ms] ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              />
            </>
          ) : (
            <>
              <Skeleton className="h-2 w-16 mb-2" />
              <Skeleton className="h-5 w-10" />
            </>
          )}
        </div>

        {/* Health score */}
        <div className={`rounded-xl border p-3 transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-200/80 bg-slate-100/50'
        }`}>
          {health !== null ? (
            <>
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Health Score
              </p>
              <AnimatedValue
                value={`${health}%`}
                className={`text-lg font-extrabold block mt-1 ${healthColor}`}
              />
            </>
          ) : (
            <>
              <Skeleton className="h-2 w-16 mb-2" />
              <Skeleton className="h-5 w-10" />
            </>
          )}
        </div>

        {/* Congestion */}
        <div className={`rounded-xl border p-3 transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-200/80 bg-slate-100/50'
        }`}>
          {congestionPct !== null ? (
            <>
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Congestion
              </p>
              <AnimatedValue
                value={`${congestionPct}%`}
                className={`text-lg font-extrabold block mt-1 ${
                  congestionPct >= 70
                    ? 'text-rose-400'
                    : congestionPct >= 40
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              />
            </>
          ) : (
            <>
              <Skeleton className="h-2 w-16 mb-2" />
              <Skeleton className="h-5 w-10" />
            </>
          )}
        </div>

        {/* Junction */}
        <div className={`rounded-xl border p-3 transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-200/80 bg-slate-100/50'
        }`}>
          {m ? (
            <>
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Junction
              </p>
              <p className={`text-[10px] font-extrabold mt-1 truncate transition-colors duration-[800ms] ${
                isDark ? 'text-slate-300' : 'text-slate-800'
              }`}>
                {(m.junction_id || 'Junction').replace(/_/g, ' ')}
              </p>
              <p className="text-[8px] text-slate-500 font-mono mt-0.5">
                {m.camera_id}
              </p>
            </>
          ) : (
            <>
              <Skeleton className="h-2 w-16 mb-2" />
              <Skeleton className="h-5 w-10" />
            </>
          )}
        </div>
      </div>

      {/* ── Health score sparkline ── */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="h-3 w-3 text-emerald-500/60" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Health History (30s)
          </span>
        </div>
        <div className="h-14 w-full">
          {historyRef.current.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={historyRef.current}
                margin={{ top: 2, right: 2, left: -30, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="health"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#healthGrad)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          )}
        </div>
      </div>

      {/* ── Lane queue breakdown ── */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Layers className="h-3 w-3 text-slate-500/60" />
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Lane Queues
          </p>
        </div>
        {laneEntries.length > 0 ? (
          <div className="space-y-2">
            {laneEntries.map(([lane, metric]) => (
              <LaneBar
                key={lane}
                lane={lane}
                queueLength={metric.queue_length}
                avgWaitSec={metric.avg_wait_sec}
                maxQueue={maxQueue}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {['NORTH', 'SOUTH', 'EAST', 'WEST'].map((lane) => (
              <div key={lane} className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-2 w-12" />
                  <Skeleton className="h-2 w-8" />
                </div>
                <Skeleton className="h-1 w-full" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default LiveMetricsPanel;
