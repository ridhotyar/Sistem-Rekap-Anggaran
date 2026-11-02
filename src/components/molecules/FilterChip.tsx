import React from 'react';

export interface FilterChipProps {
  label: string;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  count,
  isSelected,
  onClick,
  icon,
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
        isSelected
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 shadow-xs'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
      }`}
    >
      {icon && <span className="w-3.5 h-3.5">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
            isSelected
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
