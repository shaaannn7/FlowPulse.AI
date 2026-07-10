/**
 * File: Breadcrumbs.tsx
 * Purpose: Dynamically renders navigational breadcrumbs based on system states.
 * Why it exists: Enforces orientation and navigation, letting operators know exactly which junction context or log view is active.
 */

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  paths: string[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ paths }) => {
  return (
    <nav className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold tracking-wider uppercase mb-5 select-none">
      <div className="flex items-center gap-1 hover:text-slate-350 transition-colors">
        <Home className="h-3 w-3" />
        <span>Central</span>
      </div>
      
      {paths.map((p, idx) => (
        <React.Fragment key={p}>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className={idx === paths.length - 1 ? 'text-emerald-400 font-semibold' : 'hover:text-slate-350 transition-colors cursor-pointer'}>
            {p}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
};
export default Breadcrumbs;
