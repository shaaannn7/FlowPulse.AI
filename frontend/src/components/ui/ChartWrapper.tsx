/**
 * File: ChartWrapper.tsx
 * Purpose: Reusable Chart Card Wrapper.
 * Why it exists: Provides standard framing controls for telemetry charts, handling loader layers and empty indicators.
 */

import React from 'react';
import { Card } from './Card';
import { Skeleton, EmptyState } from './States';

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  empty?: boolean;
  children: React.ReactNode;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  subtitle,
  loading = false,
  empty = false,
  children,
}) => {
  return (
    <Card variant="glass" className="flex flex-col min-h-[300px]">
      <div className="flex flex-col gap-0.5 mb-5">
        <h4 className="text-xs font-bold text-slate-200">{title}</h4>
        {subtitle && <p className="text-[10px] text-slate-500 font-semibold">{subtitle}</p>}
      </div>

      <div className="flex-1 w-full h-full relative flex items-center justify-center">
        {loading ? (
          <div className="w-full space-y-4">
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        ) : empty ? (
          <div className="w-full">
            <EmptyState
              title="No chart data available"
              description="Analytics records for this timeframe are empty."
            />
          </div>
        ) : (
          <div className="w-full h-48 select-none">{children}</div>
        )}
      </div>
    </Card>
  );
};
export default ChartWrapper;
