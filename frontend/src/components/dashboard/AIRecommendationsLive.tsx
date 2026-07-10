/**
 * File: AIRecommendationsLive.tsx
 * Purpose: Live AI signal optimization recommendation feed.
 * Why it exists: Displays real-time recommendations pushed from the backend
 *                AI engine via WebSocket, styled with severity-coded cards.
 */

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import type { AIRecommendation } from '../../types/video';

const SEVERITY_STYLES: Record<AIRecommendation['severity'], {
  border: string; bg: string; text: string; badge: string;
}> = {
  OPTIMAL: {
    border: 'border-emerald-500/15',
    bg: 'bg-emerald-950/10',
    text: 'text-emerald-400',
    badge: 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400',
  },
  RECOMMENDATION: {
    border: 'border-amber-500/15',
    bg: 'bg-amber-950/10',
    text: 'text-amber-400',
    badge: 'bg-amber-950/40 border-amber-500/20 text-amber-400',
  },
  ALERT: {
    border: 'border-rose-500/20',
    bg: 'bg-rose-950/10',
    text: 'text-rose-400',
    badge: 'bg-rose-950/40 border-rose-500/20 text-rose-400',
  },
};

const SeverityIcon: React.FC<{ severity: AIRecommendation['severity'] }> = ({ severity }) => {
  if (severity === 'ALERT') return <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />;
  if (severity === 'RECOMMENDATION') return <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
  return <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
};

export const AIRecommendationsLive: React.FC = () => {
  const { recommendations, lastMetrics } = useWebSocket();

  // Derive local fallback recommendations from live metrics when WS recs are absent
  const displayRecs: AIRecommendation[] = recommendations.length > 0
    ? recommendations.slice(0, 4)
    : (() => {
        const health = lastMetrics?.health_score ?? 100;
        const emergency = lastMetrics?.emergency_detected ?? false;
        const severity: AIRecommendation['severity'] =
          emergency ? 'ALERT' : health < 50 ? 'ALERT' : health < 75 ? 'RECOMMENDATION' : 'OPTIMAL';

        return [{
          id: 'fallback',
          title: emergency
            ? 'Emergency Priority Preemption'
            : health < 50
            ? 'Critical Congestion Detected'
            : health < 75
            ? 'Adaptive Phase Adjustment'
            : 'AI Adaptive Flow Optimal',
          severity,
          confidence: emergency ? 0.99 : health < 50 ? 0.91 : health < 75 ? 0.80 : 0.94,
          reason: emergency
            ? 'Emergency vehicle approaching. Signal preemption protocol initiated.'
            : health < 50
            ? `Health score at ${health}%. Extend primary green phase immediately.`
            : health < 75
            ? `Moderate congestion detected (health: ${health}%). Phase adjustment recommended.`
            : `All lanes operating within optimal parameters. Health: ${health}%.`,
          improvement: emergency
            ? 'Estimated clearance: 12 seconds. Green corridor activated.'
            : health < 50
            ? 'Extending green phase reduces queue by ~40%.'
            : health < 75
            ? 'Reduces avg wait time by 18 seconds.'
            : 'CO2 reduction 14% this hour. Autopilot proceeding normally.',
          timestamp: Date.now() / 1000,
        }];
      })();

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Cpu className="h-4 w-4 text-emerald-400" />
        <h4 className="text-xs font-bold text-slate-200">AI Optimization Engine</h4>
        {recommendations.length > 0 && (
          <span className="ml-auto text-[8px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
            LIVE
          </span>
        )}
      </div>

      {/* Recommendation cards */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
        <AnimatePresence mode="popLayout">
          {displayRecs.map((rec) => {
            const style = SEVERITY_STYLES[rec.severity];
            const isAlert = rec.severity === 'ALERT';
            const pulseClass = isAlert
              ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)] bg-rose-950/20 animate-pulse-slow'
              : '';

            return (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className={`rounded-xl border p-4 space-y-2.5 transition-all duration-300 ${style.border} ${style.bg} ${pulseClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200 leading-tight">{rec.title}</span>
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-extrabold font-mono uppercase shrink-0 ${style.badge}`}>
                    {rec.severity}
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">{rec.reason}</p>

                {/* Confidence bar */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[8px] text-slate-600 font-bold uppercase">Confidence</span>
                    <span className={`text-[8px] font-extrabold font-mono ${style.text}`}>
                      {Math.round(rec.confidence * 100)}%
                    </span>
                  </div>
                  <div className="h-0.5 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        rec.severity === 'OPTIMAL' ? 'bg-emerald-500' :
                        rec.severity === 'RECOMMENDATION' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      animate={{ width: `${rec.confidence * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>

                <div className={`flex items-start gap-1.5 border-t border-white/5 pt-2.5`}>
                  <SeverityIcon severity={rec.severity} />
                  <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">{rec.improvement}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIRecommendationsLive;
