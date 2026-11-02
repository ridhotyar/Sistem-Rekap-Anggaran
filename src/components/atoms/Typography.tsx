import React from 'react';

export const Heading: React.FC<{
  level?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}> = ({ level = 1, children, className = '' }) => {
  const styles = {
    1: 'text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white',
    2: 'text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white',
    3: 'text-lg sm:text-xl font-semibold text-slate-900 dark:text-white',
    4: 'text-base font-semibold text-slate-900 dark:text-white',
  };

  const Component = `h${level}` as React.ElementType;
  return <Component className={`${styles[level]} ${className}`}>{children}</Component>;
};

export const Text: React.FC<{
  children: React.ReactNode;
  variant?: 'body' | 'muted' | 'caption' | 'bold';
  className?: string;
}> = ({ children, variant = 'body', className = '' }) => {
  const styles = {
    body: 'text-sm text-slate-700 dark:text-slate-300',
    muted: 'text-xs sm:text-sm text-slate-500 dark:text-slate-400',
    caption: 'text-xs text-slate-400 dark:text-slate-500',
    bold: 'text-sm font-semibold text-slate-900 dark:text-slate-100',
  };

  return <p className={`${styles[variant]} ${className}`}>{children}</p>;
};
