/**
 * File: SimulationControlPanel.tsx
 * Purpose: Local simulation modifiers panel.
 * Why it exists: Provides clickable controls to simulate emergency approach events and signal crashes.
 */

import React from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { Sliders, RotateCcw, AlertTriangle, ShieldAlert, CloudRain } from 'lucide-react';
import { useNotifications } from '../ui/Notifications';
import { playSynthesizedSound } from '../../lib/sound';

export const SimulationControlPanel: React.FC = () => {
  const {
    simState,
    triggerEmergency,
    setTrafficLoad,
    setWeather,
    toggleSignalFailure,
    resetSimulation,
  } = useDashboardStore();
  
  const { addToast } = useNotifications();

  const handleTriggerEmergency = (type: typeof simState.activeEmergency) => {
    triggerEmergency(type);
    playSynthesizedSound('click');
    if (type !== 'none') {
      addToast(`Simulated emergency approaching: ${type.toUpperCase()}`, 'warning');
    } else {
      addToast('Emergency vehicle cleared. Automatic timing restored.', 'success');
    }
  };

  const handleTrafficLoad = (load: typeof simState.trafficLoad) => {
    setTrafficLoad(load);
    playSynthesizedSound('click');
    addToast(`Traffic coefficient modified to ${load.toUpperCase()}`, 'info');
  };

  const handleWeather = (weather: typeof simState.weather) => {
    setWeather(weather);
    playSynthesizedSound('click');
    addToast(`Weather condition updated to ${weather.toUpperCase()}`, 'info');
  };

  const handleToggleFailure = () => {
    toggleSignalFailure();
    playSynthesizedSound('click');
    if (!simState.signalFailure) {
      addToast('ALERT: Signal Loop Controller failure simulation active!', 'error');
    } else {
      addToast('Signal Loop Controller returned to active loop.', 'success');
    }
  };

  return (
    <Card variant="glass" className="space-y-4">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-emerald-450" />
          <h3 className="text-xs font-bold text-slate-200">Simulation Control Panel</h3>
        </div>
        <button
          onClick={() => { resetSimulation(); playSynthesizedSound('click'); }}
          className="flex items-center gap-1 text-[8px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase cursor-pointer"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          <span>Reset Desk</span>
        </button>
      </div>

      {/* Button groups */}
      <div className="space-y-3.5">
        {/* Emergency vehicles simulation */}
        <div className="space-y-1.5">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Simulate emergency approach</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleTriggerEmergency('ambulance')}
              className={`rounded-lg py-2 text-[9px] font-bold transition-all border ${
                simState.activeEmergency === 'ambulance'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              🚑 Ambulance
            </button>
            <button
              onClick={() => handleTriggerEmergency('fire_truck')}
              className={`rounded-lg py-2 text-[9px] font-bold transition-all border ${
                simState.activeEmergency === 'fire_truck'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              🚒 Fire Truck
            </button>
            <button
              onClick={() => handleTriggerEmergency('none')}
              disabled={simState.activeEmergency === 'none'}
              className="rounded-lg bg-slate-900 border border-white/5 py-2 text-[9px] font-bold text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Clear Emergency
            </button>
          </div>
        </div>

        {/* Load simulation */}
        <div className="space-y-1.5">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Congestion Coefficients</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleTrafficLoad('light')}
              className={`rounded-lg py-2 text-[9px] font-bold transition-all border ${
                simState.trafficLoad === 'light'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              🚗 Light
            </button>
            <button
              onClick={() => handleTrafficLoad('normal')}
              className={`rounded-lg py-2 text-[9px] font-bold transition-all border ${
                simState.trafficLoad === 'normal'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              🚗 Normal
            </button>
            <button
              onClick={() => handleTrafficLoad('heavy')}
              className={`rounded-lg py-2 text-[9px] font-bold transition-all border ${
                simState.trafficLoad === 'heavy'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-450'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              🚗 Heavy Peak
            </button>
          </div>
        </div>

        {/* Weather simulation */}
        <div className="space-y-1.5">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Weather modifiers</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleWeather('clear')}
              className={`rounded-lg py-2 text-[9px] font-bold transition-all border ${
                simState.weather === 'clear'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              ☀️ Clear
            </button>
            <button
              onClick={() => handleWeather('rain')}
              className={`rounded-lg py-2 text-[9px] font-bold transition-all border ${
                simState.weather === 'rain'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <CloudRain className="inline h-3 w-3 mr-1" />
              Rain
            </button>
            <button
              onClick={() => handleWeather('fog')}
              className={`rounded-lg py-2 text-[9px] font-bold transition-all border ${
                simState.weather === 'fog'
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              🌫 Fog
            </button>
          </div>
        </div>

        {/* Hard Failure simulation */}
        <div className="pt-2 border-t border-white/5">
          <button
            onClick={handleToggleFailure}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-bold transition-all border ${
              simState.signalFailure
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : 'bg-slate-900 border-white/5 text-rose-400 hover:bg-slate-800'
            }`}
          >
            {simState.signalFailure ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4 animate-pulse" />}
            <span>{simState.signalFailure ? 'Restore Controller Loop' : 'Simulate Controller Failure'}</span>
          </button>
        </div>
      </div>
    </Card>
  );
};
export default SimulationControlPanel;
