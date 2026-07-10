/**
 * File: Card.tsx
 * Purpose: Reusable Card and Stat layouts.
 * Why it exists: Enforces dark glassmorphism designs, hover micro-animations, and contains skeleton fallback layers.
 */

import React from 'react';
import { Skeleton } from './States';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'glass' | 'solid' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const baseClass = 'rounded-2xl border p-5 backdrop-blur-md transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]';
  const variantClass =
    variant === 'interactive'
      ? isDark
        ? 'border-white/5 bg-slate-950/20 hover:bg-slate-900/40 hover:border-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 cursor-pointer text-slate-100'
        : 'border-slate-200 bg-white/50 hover:bg-white/80 hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 cursor-pointer text-slate-900'
      : variant === 'solid'
      ? isDark
        ? 'border-white/5 bg-slate-950/90 text-slate-100'
        : 'border-slate-200 bg-white/95 text-slate-900'
      : isDark
      ? 'border-white/5 bg-slate-950/35 text-slate-100' // standard glassmorphic dark
      : 'border-slate-200/80 bg-white/60 text-slate-900'; // standard glassmorphic light

  return (
    <div className={`${baseClass} ${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  loading = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (loading) {
    return (
      <Card variant="glass" className="space-y-3.5">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </Card>
    );
  }

  return (
    <Card variant="interactive" className="flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{title}</span>
        {icon && (
          <div className={`rounded-lg border p-1.5 transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isDark 
              ? 'bg-slate-900 border-white/5 text-slate-400' 
              : 'bg-slate-100 border-slate-200 text-slate-650 text-slate-600'
          }`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3.5">
        <h3 className={`text-xl font-extrabold tracking-tight transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}>{value}</h3>
        {trend && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`flex items-center text-[10px] font-bold ${
                trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.value}%
            </span>
            {trend.label && (
              <span className="text-[9px] text-slate-500 font-semibold">{trend.label}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
