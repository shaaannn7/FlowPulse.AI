/**
 * File: Settings.tsx
 * Purpose: Signal timing bounds and AI parameter configurations page layout.
 * Why it exists: Exposes settings forms for operators to configure light safety periods and detection limits.
 */

import React from 'react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Card } from '../components/ui/Card';
import { useNotifications } from '../components/ui/Notifications';

export const Settings: React.FC = () => {
  const { addToast } = useNotifications();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Configuration settings updated successfully.', 'success');
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs paths={['System Controls', 'Optimizer Settings']} />

      <form onSubmit={handleSave} className="grid grid-cols-3 gap-6">
        {/* Card 1: Safety Timers */}
        <Card variant="glass" className="col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-200">Intersection Timing Bounds</h3>
          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
            Configure default and override durations (in seconds) for Broadway and 42nd St intersections.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Min Green Time (seconds)</label>
              <input
                type="number"
                defaultValue={10}
                className="w-full rounded-xl bg-slate-900 border border-white/5 px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Max Green Time (seconds)</label>
              <input
                type="number"
                defaultValue={60}
                className="w-full rounded-xl bg-slate-900 border border-white/5 px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Amber Clearance Warning</label>
              <input
                type="number"
                defaultValue={4}
                className="w-full rounded-xl bg-slate-900 border border-white/5 px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Red Clearance Interval</label>
              <input
                type="number"
                defaultValue={2}
                className="w-full rounded-xl bg-slate-900 border border-white/5 px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/35"
              />
            </div>
          </div>
        </Card>

        {/* Card 2: AI Filters */}
        <div className="space-y-6">
          <Card variant="glass" className="space-y-4">
            <h3 className="text-xs font-bold text-slate-200">Inference Parameters</h3>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Adjust YOLOv11 confidence and IoU tracking parameters.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>Confidence Limit</span>
                  <span className="font-mono text-emerald-400">25%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  defaultValue="25"
                  className="w-full accent-emerald-500 h-1.5 rounded-lg bg-slate-900 border border-white/5 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>IoU Overlap Minimum</span>
                  <span className="font-mono text-emerald-400">30%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  defaultValue="30"
                  className="w-full accent-emerald-500 h-1.5 rounded-lg bg-slate-900 border border-white/5 cursor-pointer"
                />
              </div>
            </div>
          </Card>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3.5 text-xs font-bold text-white transition-all shadow-lg shadow-emerald-600/15"
          >
            Save Parameter Configurations
          </button>
        </div>
      </form>
    </div>
  );
};
export default Settings;
