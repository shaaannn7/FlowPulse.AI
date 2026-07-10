import React, { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { useWebSocket } from '../../context/WebSocketContext';
import { Heart, Activity, Clock, ShieldAlert } from 'lucide-react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';

export const TrafficHealthScore: React.FC = () => {
  const { simState } = useDashboardStore();
  const { lastMetrics } = useWebSocket();

  // Dynamic values: live metrics from WebSocket take priority, fallback to simulation states
  const score = lastMetrics?.health_score
    ?? (simState.signalFailure
      ? 15
      : simState.activeEmergency !== 'none'
      ? 58
      : simState.trafficLoad === 'heavy'
      ? 62
      : simState.trafficLoad === 'light'
      ? 94
      : 82);

  const waitTime = simState.signalFailure
    ? 145
    : simState.activeEmergency !== 'none'
    ? 78
    : simState.trafficLoad === 'heavy'
    ? 64
    : simState.trafficLoad === 'light'
    ? 14
    : 28;

  const congestion = lastMetrics
    ? Math.round(lastMetrics.congestion_score * 100)
    : (simState.signalFailure
      ? 90
      : simState.activeEmergency !== 'none'
      ? 45
      : simState.trafficLoad === 'heavy'
      ? 72
      : simState.trafficLoad === 'light'
      ? 12
      : 34);

  const prevScoreRef = useRef<number>(score);
  const [trend, setTrend] = useState<'up' | 'down' | 'flat'>('flat');
  const [trendDiff, setTrendDiff] = useState<number>(0);

  useEffect(() => {
    const prev = prevScoreRef.current;
    if (score > prev) {
      setTrend('up');
      setTrendDiff(score - prev);
    } else if (score < prev) {
      setTrend('down');
      setTrendDiff(prev - score);
    } else {
      // Don't overwrite if it's the same, keep trend as is or set flat
      if (score !== prev) {
        setTrend('flat');
        setTrendDiff(0);
      }
    }
    prevScoreRef.current = score;
  }, [score]);

  // Framer Motion spring animations for the numbers
  const springScore = useSpring(score, { stiffness: 50, damping: 20 });
  const springCongestion = useSpring(congestion, { stiffness: 50, damping: 20 });
  const springWaitTime = useSpring(waitTime, { stiffness: 50, damping: 20 });

  useEffect(() => {
    springScore.set(score);
    springCongestion.set(congestion);
    springWaitTime.set(waitTime);
  }, [score, congestion, waitTime, springScore, springCongestion, springWaitTime]);

  const displayScore = useTransform(springScore, (val) => Math.round(val));
  const displayCongestion = useTransform(springCongestion, (val) => Math.round(val));
  const displayWaitTime = useTransform(springWaitTime, (val) => Math.round(val));

  const strokeDasharray = 2 * Math.PI * 34; // Radius is 34
  const strokeDashoffset = strokeDasharray - (strokeDasharray * score) / 100;

  // Determine color theme depending on score
  const colorClass = score >= 80
    ? 'text-emerald-400 stroke-emerald-500'
    : score >= 50
    ? 'text-amber-400 stroke-amber-500'
    : 'text-rose-400 stroke-rose-500';

  const glowClass = score >= 80
    ? 'shadow-emerald-500/20'
    : score >= 50
    ? 'shadow-amber-500/20'
    : 'shadow-rose-500/20';

  return (
    <Card variant="glass" className={`relative overflow-hidden group shadow-lg ${glowClass}`}>
      {/* Dynamic ambient highlight glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/10 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
      
      <div className="grid grid-cols-3 gap-6 items-center relative z-10">
        {/* Animated Radial Gauge */}
        <div className="flex flex-col items-center justify-center relative col-span-1">
          {/* Pulsing ring overlay */}
          <motion.div
            className={`absolute rounded-full border-2 ${
              score >= 80 ? 'border-emerald-500/20' : score >= 50 ? 'border-amber-500/20' : 'border-rose-500/20'
            }`}
            style={{ width: 84, height: 84 }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          />

          <svg className="w-24 h-24 transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="48"
              cy="48"
              r="34"
              className="stroke-slate-900/60 fill-transparent"
              strokeWidth="6"
            />
            {/* Animated foreground progress ring */}
            <motion.circle
              cx="48"
              cy="48"
              r="34"
              className={`fill-transparent transition-all duration-700 ease-out ${colorClass}`}
              strokeWidth="6"
              strokeDasharray={strokeDasharray}
              initial={{ strokeDashoffset: strokeDasharray }}
              animate={{ strokeDashoffset }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <motion.span className="text-xl font-black tracking-tight text-white leading-none">{displayScore}</motion.span>
            {trend !== 'flat' && trendDiff > 0 ? (
              <span className={`text-[8px] font-black font-mono tracking-tighter flex items-center leading-none mt-1 ${
                trend === 'up' ? 'text-emerald-450 text-emerald-400' : 'text-rose-450 text-rose-400'
              }`}>
                {trend === 'up' ? '▲' : '▼'}{trendDiff}%
              </span>
            ) : (
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest font-mono mt-0.5">Index</span>
            )}
          </div>
        </div>

        {/* Dynamic Telemetry Stats */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            {simState.signalFailure ? (
              <ShieldAlert className="h-4 w-4 text-rose-500 animate-pulse" />
            ) : (
              <Heart className={`h-4 w-4 ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-rose-500'}`} />
            )}
            <div>
              <h4 className="text-[9px] text-slate-550 font-bold uppercase tracking-wider font-mono">System Flow Status</h4>
              <p className="text-[11px] font-extrabold text-slate-200 mt-0.5">
                {simState.signalFailure
                  ? 'CRITICAL CONTROLLER FAILURE'
                  : score >= 85
                  ? 'Optimal Grid Synchronization'
                  : score >= 60
                  ? 'Adaptive Dampening Active'
                  : 'High Bottleneck Density'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase font-mono">
                <Activity className="h-3 w-3" />
                <span>Density</span>
              </div>
              <p className="text-sm font-extrabold text-slate-200 font-mono"><motion.span>{displayCongestion}</motion.span>%</p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase font-mono">
                <Clock className="h-3 w-3" />
                <span>Wait Index</span>
              </div>
              <p className="text-sm font-extrabold text-slate-200 font-mono">+<motion.span>{displayWaitTime}</motion.span>s</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TrafficHealthScore;
