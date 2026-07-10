/**
 * File: TrafficPredictionPanel.tsx
 * Purpose: Congestion predictive analytics panel.
 * Why it exists: Shows machine learning predictions for peak wait times, rush hours, and confidence parameters.
 */

import React from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { useTheme } from '../../hooks/useTheme';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

export const TrafficPredictionPanel: React.FC = () => {
  const { simState } = useDashboardStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const loadMultiplier = simState.trafficLoad === 'heavy' ? 1.6 : simState.trafficLoad === 'light' ? 0.5 : 1.0;

  // Mock prediction series
  const data = [
    { name: '12 PM', congestion: Math.round(35 * loadMultiplier) },
    { name: '1 PM', congestion: Math.round(28 * loadMultiplier) },
    { name: '2 PM', congestion: Math.round(32 * loadMultiplier) },
    { name: '3 PM', congestion: Math.round(48 * loadMultiplier) },
    { name: '4 PM', congestion: Math.round(62 * loadMultiplier) },
    { name: '5 PM', congestion: Math.round(78 * loadMultiplier) },
    { name: '6 PM', congestion: Math.round(84 * loadMultiplier) },
  ];

  return (
    <Card variant="glass" className="space-y-4">
      <div className={`flex justify-between items-center border-b pb-3 transition-colors duration-[800ms] ${
        isDark ? 'border-white/5' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-450" />
          <h4 className={`text-xs font-bold transition-colors duration-[800ms] ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>AI Traffic Flow predictions</h4>
        </div>
        <span className="text-[8px] font-bold text-slate-500 font-mono">Confidence: 91.4%</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-lg border p-3 space-y-1 transition-all duration-[800ms] ${
          isDark 
            ? 'bg-slate-900/40 border-white/5' 
            : 'bg-slate-100/50 border-slate-200/80'
        }`}>
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Next Peak Hour</span>
          <p className={`text-sm font-extrabold font-sans transition-colors duration-[800ms] ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>05:30 PM - 06:30 PM</p>
        </div>
        <div className={`rounded-lg border p-3 space-y-1 transition-all duration-[800ms] ${
          isDark 
            ? 'bg-slate-900/40 border-white/5' 
            : 'bg-slate-100/50 border-slate-200/80'
        }`}>
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Projected Queue Delay</span>
          <p className={`text-sm font-extrabold font-sans transition-colors duration-[800ms] ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>+{Math.round(42 * loadMultiplier)}s max wait</p>
        </div>
      </div>

      {/* Render Recharts line prediction graph */}
      <div className="h-28 w-full mt-2 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="name"
              stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
              fontSize={8}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide={true} />
            <Tooltip
              contentStyle={{
                background: isDark ? '#090a0f' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                borderRadius: '8px',
                color: isDark ? '#cbd5e1' : '#1e293b'
              }}
              labelStyle={{ fontSize: '8px', color: '#64748b', fontWeight: 'bold' }}
              itemStyle={{ fontSize: '10px', color: isDark ? '#34d399' : '#059669', fontWeight: 'bold' }}
            />
            <Line
              type="monotone"
              dataKey="congestion"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
export default TrafficPredictionPanel;
