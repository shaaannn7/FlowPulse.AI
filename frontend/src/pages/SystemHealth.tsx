/**
 * File: SystemHealth.tsx
 * Purpose: System diagnostics and hardware health status layout page.
 * Why it exists: Displays thread execution status, DB engine delays, and memory pool allocations.
 */

import React from 'react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Card, StatCard } from '../components/ui/Card';
import { Table, type Column } from '../components/ui/Table';
import { ShieldCheck, HardDrive, Cpu } from 'lucide-react';

interface HealthMetric {
  name: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latency: string;
}

export const SystemHealth: React.FC = () => {
  const healthData: HealthMetric[] = [
    { name: 'FastAPI Gateway Server', status: 'ONLINE', latency: '4ms' },
    { name: 'SQLite Core Engine', status: 'ONLINE', latency: '1ms' },
    { name: 'WebSocket Broadcast Server', status: 'ONLINE', latency: '12ms' },
    { name: 'YOLOv11 Inference Thread', status: 'ONLINE', latency: '24ms' },
  ];

  const columns: Column<HealthMetric>[] = [
    { key: 'name', header: 'Subsystem Module', sortable: true },
    {
      key: 'status',
      header: 'Operational Status',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-950/45 px-2 py-0.5 rounded border border-emerald-500/15">
          {row.status}
        </span>
      ),
    },
    { key: 'latency', header: 'Processing Latency', sortable: true },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs paths={['System Diagnostics', 'System Health']} />

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard
          title="Central CPU Utilization"
          value="18%"
          icon={<Cpu className="h-4 w-4" />}
          trend={{ value: 1.2, isPositive: false, label: 'idle' }}
        />
        <StatCard
          title="Memory Allocations"
          value="1.24 GB / 8.00 GB"
          icon={<HardDrive className="h-4 w-4" />}
        />
        <StatCard
          title="DB Engine Connection"
          value="Active (Pool OK)"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Table columns={columns} data={healthData} pageSize={5} />
        </div>

        <Card variant="glass" className="space-y-4">
          <h4 className="text-xs font-bold text-slate-200">Hardware Detection</h4>
          <div className="space-y-3 font-mono text-[10px] text-slate-400 leading-relaxed">
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span>Execution Engine:</span>
              <span className="text-emerald-400 font-bold">CUDA GPU</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span>Device Name:</span>
              <span>NVIDIA RTX 4070</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1.5">
              <span>VRAM Allocations:</span>
              <span>4.2 GB / 12.0 GB</span>
            </div>
            <div className="flex justify-between">
              <span>CUDA Toolkit Version:</span>
              <span>12.2.0</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default SystemHealth;
