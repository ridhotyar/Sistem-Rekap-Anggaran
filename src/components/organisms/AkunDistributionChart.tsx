import React, { useMemo } from 'react';
import { PieChart, TrendingUp } from 'lucide-react';
import { Card } from '../atoms/Card';
import { CurrencyText } from '../atoms/CurrencyText';
import { RincianBelanjaItem } from '../../types/budget';

export interface AkunDistributionChartProps {
  items: RincianBelanjaItem[];
}

const COLOR_PALETTE = [
  'bg-emerald-500 text-emerald-500',
  'bg-sky-500 text-sky-500',
  'bg-amber-500 text-amber-500',
  'bg-indigo-500 text-indigo-500',
  'bg-rose-500 text-rose-500',
  'bg-teal-500 text-teal-500',
];

export const AkunDistributionChart: React.FC<AkunDistributionChartProps> = ({ items }) => {
  const distribution = useMemo(() => {
    const total = items.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
    if (total === 0) return [];

    const map: Record<string, { label: string; kode: string; total: number }> = {};

    items.forEach((item) => {
      const key = item.kode_akun || 'Lainnya';
      if (!map[key]) {
        map[key] = {
          label: item.nama_akun || key,
          kode: item.kode_akun || '',
          total: 0,
        };
      }
      map[key].total += item.total_harga || 0;
    });

    return Object.values(map)
      .map((entry, index) => ({
        ...entry,
        percentage: (entry.total / total) * 100,
        colorClass: COLOR_PALETTE[index % COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.total - a.total);
  }, [items]);

  if (distribution.length === 0) return null;

  return (
    <Card variant="default" padding="md" className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Proporsi Alokasi Belanja per Rekening Akun
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {distribution.length} Jenis Belanja
        </span>
      </div>

      {/* Stacked Progress Bar */}
      <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden mb-4">
        {distribution.map((item) => (
          <div
            key={item.kode}
            style={{ width: `${item.percentage}%` }}
            className={`h-full transition-all duration-300 ${item.colorClass.split(' ')[0]}`}
            title={`${item.label}: ${item.percentage.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {distribution.map((item) => (
          <div
            key={item.kode}
            className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
          >
            <div
              className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                item.colorClass.split(' ')[0]
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {item.label}
                </span>
                <span className="font-bold text-slate-900 dark:text-white shrink-0">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                <CurrencyText amount={item.total} compact />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
