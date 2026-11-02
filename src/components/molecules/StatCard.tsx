import React from 'react';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Typography';

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  trend?: {
    label: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  trend,
  onClick,
}) => {
  return (
    <Card
      variant="default"
      padding="md"
      className={`relative overflow-hidden transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Text variant="muted" className="font-medium truncate mb-1">
            {title}
          </Text>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
            {value}
          </div>
          {(subtitle || trend) && (
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              {trend && (
                <span
                  className={`inline-flex items-center font-medium ${
                    trend.isPositive ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {trend.label}
                </span>
              )}
              {subtitle && <span className="text-slate-500 dark:text-slate-400 truncate">{subtitle}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl shrink-0 ${iconBgColor}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
