/**
 * File: AiRecommendationPanel.tsx
 * Purpose: AI Recommendation widget displaying optimization suggestions.
 * Why it exists: Guides operators with automated traffic decisions (extend phases, override alerts).
 */

import React from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { Cpu, CheckCircle, AlertTriangle } from 'lucide-react';

interface Recommendation {
  id: string;
  title: string;
  severity: 'OPTIMAL' | 'RECOMMENDATION' | 'ALERT';
  reason: string;
  improvement: string;
}

export const AiRecommendationPanel: React.FC = () => {
  const { simState } = useDashboardStore();

  const recommendations: Recommendation[] = [];

  if (simState.signalFailure) {
    recommendations.push({
      id: 'r_fail',
      title: 'Signal Loop Failure detected',
      severity: 'ALERT',
      reason: 'Signal controller is not ticking. Flashing amber warnings applied.',
      improvement: 'Immediate manual hardware override recommended.',
    });
  } else if (simState.activeEmergency !== 'none') {
    recommendations.push({
      id: 'r_emergency',
      title: 'Emergency Priority Preemption Active',
      severity: 'ALERT',
      reason: `Ambulance approaching on Northbound lane. North-South Green extended.`,
      improvement: 'Clear queue completely. Delay East-West phase transition.',
    });
  } else if (simState.trafficLoad === 'heavy') {
    recommendations.push({
      id: 'r_heavy',
      title: 'Extend North-South Green Phase',
      severity: 'RECOMMENDATION',
      reason: 'High volume congestion build-up detected on Broadway (North/South lanes).',
      improvement: 'Reduces queue wait time by 24 seconds.',
    });
  } else {
    recommendations.push({
      id: 'r_optimal',
      title: 'AI Autopilot flow Optimized',
      severity: 'OPTIMAL',
      reason: 'Traffic flow coefficients are balanced. Standard light loop active.',
      improvement: 'CO2 emissions reduced by 14% this hour.',
    });
  }

  return (
    <Card variant="glass" className="space-y-4 flex flex-col h-full justify-between">
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-slate-200">AI Optimization recommendations</h4>
        </div>

        <div className="space-y-3.5">
          {recommendations.map((rec) => {
            let badge = 'text-emerald-450 bg-emerald-950/40 border-emerald-500/15';
            let icon = <CheckCircle className="h-4 w-4 text-emerald-400" />;
            
            if (rec.severity === 'ALERT') {
              badge = 'text-rose-455 bg-rose-950/40 border-rose-500/15';
              icon = <AlertTriangle className="h-4 w-4 text-rose-400" />;
            } else if (rec.severity === 'RECOMMENDATION') {
              badge = 'text-amber-455 bg-amber-950/40 border-amber-500/15';
              icon = <AlertTriangle className="h-4 w-4 text-amber-400" />;
            }

            return (
              <div key={rec.id} className="rounded-xl border border-white/5 bg-slate-950/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{rec.title}</span>
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-extrabold font-mono uppercase ${badge}`}>
                    {rec.severity}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{rec.reason}</p>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold border-t border-white/5 pt-2 mt-1">
                  {icon}
                  <span>{rec.improvement}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
export default AiRecommendationPanel;
