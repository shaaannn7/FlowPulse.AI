/**
 * File: VehicleAnalytics.tsx
 * Purpose: Vehicle Classification analytics display.
 * Why it exists: Classifies vehicle counts (Cars, Bikes, Trucks, Ambulances) dynamically depending on traffic loads.
 */

import React from 'react';
import { Card } from '../ui/Card';
import { useDashboardStore } from '../../hooks/useDashboardStore';
import { Car, Bike, Truck, Shield, Bus, UserCheck } from 'lucide-react';

export const VehicleAnalytics: React.FC = () => {
  const { simState } = useDashboardStore();

  const loadMultiplier = simState.trafficLoad === 'heavy' 
    ? 2.5 
    : simState.trafficLoad === 'light' 
    ? 0.4 
    : 1.0;

  const categories = [
    { name: 'Cars', count: Math.round(14 * loadMultiplier), change: '+4.2%', icon: <Car className="h-4 w-4 text-emerald-450" /> },
    { name: 'Trucks', count: Math.round(4 * loadMultiplier), change: '-1.5%', icon: <Truck className="h-4 w-4 text-violet-400" /> },
    { name: 'Buses', count: Math.round(2 * loadMultiplier), change: '0.0%', icon: <Bus className="h-4 w-4 text-indigo-400" /> },
    { name: 'Bikes', count: Math.round(3 * loadMultiplier), change: '+8.1%', icon: <Bike className="h-4 w-4 text-amber-400" /> },
    { name: 'Emergency', count: simState.activeEmergency !== 'none' ? 1 : 0, change: 'Priority', icon: <Shield className="h-4 w-4 text-rose-400" /> },
    { name: 'Pedestrians', count: Math.round(6 * (loadMultiplier * 0.8)), change: '+2.4%', icon: <UserCheck className="h-4 w-4 text-sky-400" /> },
  ];

  return (
    <div className="grid grid-cols-6 gap-4">
      {categories.map((cat) => (
        <Card key={cat.name} variant="interactive" className="p-4 flex flex-col justify-between min-h-[90px]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-slate-500 font-bold uppercase">{cat.name}</span>
            {cat.icon}
          </div>
          <div className="mt-2.5">
            <span className="text-base font-extrabold text-slate-200">{cat.count}</span>
            <span className="text-[8px] text-slate-550 font-bold ml-1.5">{cat.change}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};
export default VehicleAnalytics;
