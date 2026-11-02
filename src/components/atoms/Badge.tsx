import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 leading-tight',
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  const variantClasses = {
    primary: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    secondary: 'bg-indigo-50 text-indigo-700 border border-indigo-200/70',
    success: 'bg-teal-50 text-teal-700 border border-teal-200/70',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/70',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/70',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/70',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const dotClasses = {
    primary: 'bg-emerald-500',
    secondary: 'bg-indigo-500',
    success: 'bg-teal-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} />}
      {children}
    </span>
  );
};
