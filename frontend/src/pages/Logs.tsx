/**
 * File: Logs.tsx
 * Purpose: Chronological timeline system event logs page layout.
 * Why it exists: Displays real-time signal loop actuations, errors, and operator overrides.
 */

import React from 'react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Table, type Column } from '../components/ui/Table';
import { ClipboardList } from 'lucide-react';

interface SystemLogEntry {
  id: number;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  source: string;
}

export const Logs: React.FC = () => {
  const mockLogs: SystemLogEntry[] = [
    { id: 1, timestamp: '11:24:02 AM', level: 'INFO', message: 'Signal phase transitioned NORTH_SOUTH -> EAST_WEST. Allocated 20s.', source: 'CONTROLLER' },
    { id: 2, timestamp: '11:23:44 AM', level: 'INFO', message: 'Database schema migrations completed successfully.', source: 'DATABASE' },
    { id: 3, timestamp: '11:22:15 AM', level: 'WARNING', message: 'Low frame rate detected on cam_north_01. FPS: 12.', source: 'AI_PIPELINE' },
    { id: 4, timestamp: '11:21:00 AM', level: 'ERROR', message: 'Failed RTSP handshake on stream cam_east_02. Retrying...', source: 'AI_PIPELINE' },
    { id: 5, timestamp: '11:20:10 AM', level: 'INFO', message: 'WebSocket gateway client connection established.', source: 'WEBSOCKET' },
  ];

  const columns: Column<SystemLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (row) => <span className="font-mono text-slate-400">{row.timestamp}</span>,
    },
    {
      key: 'level',
      header: 'Level',
      sortable: true,
      render: (row) => {
        let badge = 'bg-slate-900 border-white/5 text-slate-400';
        if (row.level === 'ERROR') badge = 'bg-rose-950/40 border-rose-500/15 text-rose-450';
        if (row.level === 'WARNING') badge = 'bg-amber-950/40 border-amber-500/15 text-amber-450';
        return (
          <span className={`px-2 py-0.5 rounded border text-[8px] font-extrabold ${badge}`}>
            {row.level}
          </span>
        );
      },
    },
    { key: 'message', header: 'Event Message' },
    { key: 'source', header: 'Component Source', sortable: true },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs paths={['System Diagnostics', 'Actuation Logs']} />

      {/* Header and Filter Row */}
      <div className="flex justify-between items-center bg-slate-950/15 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-slate-400 h-4 w-4" />
          <h3 className="text-xs font-bold text-slate-200">System Log timeline</h3>
        </div>
        
        {/* Filters stubs */}
        <div className="flex gap-2">
          <select className="rounded-lg bg-slate-900 border border-white/5 px-3 py-1.5 text-[10px] text-slate-400 focus:outline-none font-bold">
            <option>All Modules</option>
            <option>CONTROLLER</option>
            <option>AI_PIPELINE</option>
            <option>DATABASE</option>
          </select>
          <select className="rounded-lg bg-slate-900 border border-white/5 px-3 py-1.5 text-[10px] text-slate-400 focus:outline-none font-bold">
            <option>All Levels</option>
            <option>INFO</option>
            <option>WARNING</option>
            <option>ERROR</option>
          </select>
        </div>
      </div>

      <Table columns={columns} data={mockLogs} pageSize={5} />
    </div>
  );
};
export default Logs;
