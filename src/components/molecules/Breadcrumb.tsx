import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onHomeClick?: () => void;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  onHomeClick,
  className = '',
}) => {
  return (
    <nav className={`flex items-center text-xs sm:text-sm text-slate-500 overflow-x-auto py-1 ${className}`}>
      <button
        onClick={onHomeClick}
        className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors cursor-pointer text-slate-600 dark:text-slate-400 font-medium shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Beranda</span>
      </button>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3.5 h-3.5 mx-2 text-slate-400 shrink-0" />
          {item.active || !item.onClick ? (
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs sm:max-w-md">
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="hover:text-emerald-600 transition-colors cursor-pointer truncate max-w-xs font-medium text-slate-600 dark:text-slate-400"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
