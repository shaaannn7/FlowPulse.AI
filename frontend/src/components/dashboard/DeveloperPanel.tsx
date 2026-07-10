/**
 * File: DeveloperPanel.tsx
 * Purpose: Diagnostic Developer toggler panel.
 * Why it exists: Enables developers or testers to toggle video bounding box labels, lane grids, and FPS counters in real-time.
 */

import React from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { Terminal } from 'lucide-react';
import { playSynthesizedSound } from '../../lib/sound';

export const DeveloperPanel: React.FC = () => {
  const { devSettings, toggleDevSetting } = useDashboardStore();

  const handleToggle = (key: keyof typeof devSettings) => {
    toggleDevSetting(key);
    playSynthesizedSound('click');
  };

  const settingsList = [
    { key: 'showBoundingBoxes' as const, label: 'Render Bounding Boxes' },
    { key: 'showLaneLines' as const, label: 'Render Lane Lines' },
    { key: 'showDetectionLabels' as const, label: 'Render Vehicle Labels' },
    { key: 'showFps' as const, label: 'Render Stream FPS' },
    { key: 'isDebugMode' as const, label: 'Enable Debug Console logs' },
    { key: 'showPerformanceMetrics' as const, label: 'Show Hardware Performance' },
  ];

  return (
    <Card variant="glass" className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Terminal className="h-4 w-4 text-emerald-450" />
        <h4 className="text-xs font-bold text-slate-200">Developer Diagnostic panel</h4>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {settingsList.map((setting) => {
          const isActive = devSettings[setting.key];
          return (
            <button
              key={setting.key}
              onClick={() => handleToggle(setting.key)}
              className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold shadow-md shadow-emerald-500/5'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider">{setting.label}</span>
              <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-700'}`} />
            </button>
          );
        })}
      </div>
    </Card>
  );
};
export default DeveloperPanel;
