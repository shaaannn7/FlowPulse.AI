/**
 * File: Analytics.tsx
 * Purpose: City congestion and vehicle analytics report page.
 * Why it exists: Assembles performance analytics widgets, hourly volume logs, and traffic rate charts.
 */

import React from 'react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { StatCard } from '../components/ui/Card';
import { ChartWrapper } from '../components/ui/ChartWrapper';
import { Table, type Column } from '../components/ui/Table';
import { TrendingUp, Award, Calendar } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface MockLogEntry {
  timestamp: string;
  count: number;
  score: number;
  peakStatus: string;
}

export const Analytics: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const mockTableData: MockLogEntry[] = [
    { timestamp: '08:00 AM', count: 420, score: 0.76, peakStatus: 'HEAVY' },
    { timestamp: '09:00 AM', count: 380, score: 0.65, peakStatus: 'MODERATE' },
    { timestamp: '10:00 AM', count: 290, score: 0.45, peakStatus: 'MODERATE' },
    { timestamp: '11:00 AM', count: 210, score: 0.32, peakStatus: 'LIGHT' },
    { timestamp: '12:00 PM', count: 250, score: 0.38, peakStatus: 'LIGHT' },
  ];

  const columns: Column<MockLogEntry>[] = [
    { key: 'timestamp', header: 'Timestamp', sortable: true },
    { key: 'count', header: 'Vehicles Count', sortable: true },
    {
      key: 'score',
      header: 'Congestion Ratio',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-emerald-450">{(row.score * 100).toFixed(0)}%</span>
      ),
    },
    {
      key: 'peakStatus',
      header: 'Peak Load Status',
      render: (row) => {
        let badge = isDark ? 'bg-slate-900 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-650 text-slate-600';
        if (row.peakStatus === 'HEAVY') badge = isDark ? 'bg-rose-950/40 border-rose-500/15 text-rose-400' : 'bg-rose-100 border-rose-200 text-rose-600';
        if (row.peakStatus === 'MODERATE') badge = isDark ? 'bg-amber-950/40 border-amber-500/15 text-amber-400' : 'bg-amber-100 border-amber-200 text-amber-600';
        return (
          <span className={`px-2.5 py-0.5 rounded border text-[9px] font-bold transition-all duration-[800ms] ${badge}`}>
            {row.peakStatus}
          </span>
        );
      },
    },
  ];

  // Mock datasets for chart widgets
  const flowData = [
    { hour: '8 AM', rate: 240 },
    { hour: '10 AM', rate: 310 },
    { hour: '12 PM', rate: 190 },
    { hour: '2 PM', rate: 260 },
    { hour: '4 PM', rate: 410 },
    { hour: '6 PM', rate: 480 },
  ];

  const densityData = [
    { hour: '8 AM', density: 68 },
    { hour: '10 AM', density: 45 },
    { hour: '12 PM', density: 30 },
    { hour: '2 PM', density: 55 },
    { hour: '4 PM', density: 72 },
    { hour: '6 PM', density: 85 },
  ];

  const usageData = [
    { phase: 'North-South', cycles: 124 },
    { phase: 'East-West', cycles: 98 },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs paths={['Monitor Workspace', 'City Analytics']} />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard
          title="Daily Peak Volume"
          value="4,214 vehicles"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{ value: 12, isPositive: true, label: 'vs yesterday' }}
        />
        <StatCard
          title="Optimal Signals Efficiency"
          value="94.2%"
          icon={<Award className="h-4 w-4" />}
          trend={{ value: 3, isPositive: true, label: 'vs yesterday' }}
        />
        <StatCard
          title="Reporting Interval"
          value="Last 24 Hours"
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Reusable chart wrappers layout */}
      <div className="grid grid-cols-3 gap-6">
        <ChartWrapper
          title="Vehicle Flow Rate"
          subtitle="Hourly count rates passing through Broadway intersections"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={flowData}>
              <XAxis dataKey="hour" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} fontSize={8} tickLine={false} axisLine={false} />
              <YAxis hide={true} />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#090a0f' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                  color: isDark ? '#cbd5e1' : '#1e293b'
                }}
                labelStyle={{ fontSize: '8px', color: '#64748b', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold' }}
              />
              <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper
          title="Congestion Density Ratio"
          subtitle="Measures intersection queue density coefficients"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={densityData}>
              <XAxis dataKey="hour" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} fontSize={8} tickLine={false} axisLine={false} />
              <YAxis hide={true} />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#090a0f' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                  color: isDark ? '#cbd5e1' : '#1e293b'
                }}
                labelStyle={{ fontSize: '8px', color: '#64748b', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '10px', color: '#6366f1', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="density" stroke="#6366f1" fill="rgba(99, 102, 241, 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper
          title="Signal Cycle Allocations"
          subtitle="Total green phase triggers per direction loop"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={usageData}>
              <XAxis dataKey="phase" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} fontSize={8} tickLine={false} axisLine={false} />
              <YAxis hide={true} />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#090a0f' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                  color: isDark ? '#cbd5e1' : '#1e293b'
                }}
                labelStyle={{ fontSize: '8px', color: '#64748b', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold' }}
              />
              <Bar dataKey="cycles" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Table block */}
      <div className="space-y-3">
        <h3 className={`text-xs font-bold transition-colors duration-[800ms] ${
          isDark ? 'text-slate-350' : 'text-slate-800'
        }`}>Congestion Logs Rollups</h3>
        <Table columns={columns} data={mockTableData} pageSize={5} />
      </div>
    </div>
  );
};
export default Analytics;
