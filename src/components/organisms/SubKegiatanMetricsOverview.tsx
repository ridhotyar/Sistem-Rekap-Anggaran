import React, { useMemo } from 'react';
import {
  Wallet,
  Layers,
  FileSpreadsheet,
  ArrowUpRight,
  Building2,
  FolderTree,
  PieChart,
  Percent,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import { StatCard } from '../molecules/StatCard';
import { CurrencyText } from '../atoms/CurrencyText';
import { Card } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { RincianBelanjaItem, SubKegiatan } from '../../types/budget';

export interface SubKegiatanMetricsOverviewProps {
  subKegiatan?: SubKegiatan;
  items: RincianBelanjaItem[];
  allSubKegiatans?: SubKegiatan[];
  isDetailedView?: boolean;
  onSelectProgram?: (programName: string) => void;
}

const PROGRAM_THEMES = [
  {
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/70',
    badgeText: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    barColor: 'bg-emerald-500',
    borderColor: 'border-emerald-200/80 dark:border-emerald-900/60',
    hoverGlow: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    percentBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200',
    accentText: 'text-emerald-700 dark:text-emerald-400',
    bgLight: 'bg-emerald-500/10',
  },
  {
    badgeBg: 'bg-blue-50 dark:bg-blue-950/70',
    badgeText: 'text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    barColor: 'bg-blue-500',
    borderColor: 'border-blue-200/80 dark:border-blue-900/60',
    hoverGlow: 'hover:border-blue-400 dark:hover:border-blue-600',
    percentBadge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200',
    accentText: 'text-blue-700 dark:text-blue-400',
    bgLight: 'bg-blue-500/10',
  },
  {
    badgeBg: 'bg-purple-50 dark:bg-purple-950/70',
    badgeText: 'text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    barColor: 'bg-purple-500',
    borderColor: 'border-purple-200/80 dark:border-purple-900/60',
    hoverGlow: 'hover:border-purple-400 dark:hover:border-purple-600',
    percentBadge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200',
    accentText: 'text-purple-700 dark:text-purple-400',
    bgLight: 'bg-purple-500/10',
  },
  {
    badgeBg: 'bg-amber-50 dark:bg-amber-950/70',
    badgeText: 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    barColor: 'bg-amber-500',
    borderColor: 'border-amber-200/80 dark:border-amber-900/60',
    hoverGlow: 'hover:border-amber-400 dark:hover:border-amber-600',
    percentBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200',
    accentText: 'text-amber-700 dark:text-amber-400',
    bgLight: 'bg-amber-500/10',
  },
  {
    badgeBg: 'bg-rose-50 dark:bg-rose-950/70',
    badgeText: 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    barColor: 'bg-rose-500',
    borderColor: 'border-rose-200/80 dark:border-rose-900/60',
    hoverGlow: 'hover:border-rose-400 dark:hover:border-rose-600',
    percentBadge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200',
    accentText: 'text-rose-700 dark:text-rose-400',
    bgLight: 'bg-rose-500/10',
  },
  {
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/70',
    badgeText: 'text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    barColor: 'bg-cyan-500',
    borderColor: 'border-cyan-200/80 dark:border-cyan-900/60',
    hoverGlow: 'hover:border-cyan-400 dark:hover:border-cyan-600',
    percentBadge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/80 dark:text-cyan-200',
    accentText: 'text-cyan-700 dark:text-cyan-400',
    bgLight: 'bg-cyan-500/10',
  },
];

export const SubKegiatanMetricsOverview: React.FC<SubKegiatanMetricsOverviewProps> = ({
  subKegiatan,
  items,
  allSubKegiatans,
  isDetailedView = false,
  onSelectProgram,
}) => {
  // If in detailed view, calculate metrics for this specific sub-kegiatan
  if (isDetailedView && subKegiatan) {
    const totalRincian = items.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
    const uniqueAccounts = new Set(items.map((i) => i.kode_akun)).size;
    const pagu = subKegiatan.pagu_indikatif || totalRincian;
    const balance = pagu - totalRincian;

    // Largest expenditure item
    const maxItem = items.length > 0
      ? items.reduce((prev, curr) => (curr.total_harga > prev.total_harga ? curr : prev), items[0])
      : null;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Pagu Sub-Kegiatan"
          value={<CurrencyText amount={pagu} />}
          subtitle={`Tahun Anggaran ${subKegiatan.tahun}`}
          icon={<Wallet className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        />

        <StatCard
          title="Total Rincian Dibelanjakan"
          value={<CurrencyText amount={totalRincian} />}
          subtitle={
            balance === 0
              ? 'Pagu seimbang (100% teralokasi)'
              : balance > 0
              ? `Sisa pagu: ${balance.toLocaleString('id-ID')}`
              : 'Melebihi pagu indikatif'
          }
          icon={<FileSpreadsheet className="w-5 h-5" />}
          iconBgColor="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
          trend={{
            label: `${items.length} Rincian Item`,
            isPositive: balance >= 0,
          }}
        />

        <StatCard
          title="Jumlah Rekening Akun"
          value={`${uniqueAccounts} Rekening`}
          subtitle="Kode Rekening Belanja Daerah"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        />

        <StatCard
          title="Alokasi Terbesar"
          value={maxItem ? <CurrencyText amount={maxItem.total_harga} compact /> : 'Rp 0'}
          subtitle={maxItem ? maxItem.spek : 'Tidak ada rincian'}
          icon={<ArrowUpRight className="w-5 h-5" />}
          iconBgColor="bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
        />
      </div>
    );
  }

  // ================= SUMMARY VIEW =================
  // Replaced 4 old cards with:
  // 1. "Total Anggaran SKPD"
  // 2. "Nama Program dan Anggarannya (di dalamnya terdapat persentase anggaran masing-masing program)"

  const totalPaguOverall = useMemo(() => {
    return allSubKegiatans?.reduce((acc, curr) => acc + (curr.pagu_indikatif || 0), 0) || 0;
  }, [allSubKegiatans]);

  const totalSubKegiatanCount = allSubKegiatans?.length || 0;

  // Aggregate by Program
  const programStats = useMemo(() => {
    if (!allSubKegiatans || allSubKegiatans.length === 0) return [];

    const map = new Map<
      string,
      {
        kode: string;
        nama: string;
        totalPagu: number;
        subCount: number;
        withRincianCount: number;
      }
    >();

    allSubKegiatans.forEach((sub) => {
      const progName = sub.nama_program || 'Program Lainnya';
      const existing = map.get(progName) || {
        kode: sub.kode_program || '',
        nama: progName,
        totalPagu: 0,
        subCount: 0,
        withRincianCount: 0,
      };

      existing.totalPagu += sub.pagu_indikatif || 0;
      existing.subCount += 1;
      if ((sub.rincian_count ?? 0) > 0) {
        existing.withRincianCount += 1;
      }
      if (!existing.kode && sub.kode_program) existing.kode = sub.kode_program;
      map.set(progName, existing);
    });

    return Array.from(map.values())
      .map((p) => {
        const percentage = totalPaguOverall > 0 ? (p.totalPagu / totalPaguOverall) * 100 : 0;
        return {
          ...p,
          percentage,
        };
      })
      .sort((a, b) => {
        if (a.kode && b.kode) return a.kode.localeCompare(b.kode);
        return a.nama.localeCompare(b.nama);
      });
  }, [allSubKegiatans, totalPaguOverall]);

  return (
    <div className="space-y-4 mb-6">
      {/* 1. Card "Total Anggaran SKPD" */}
      <Card
        variant="default"
        padding="none"
        className="overflow-hidden border border-emerald-200/90 dark:border-slate-800 shadow-xs bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900"
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    Sistem Informasi Pemerintahan Daerah (SIPD)
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Total Anggaran SKPD
                  </h3>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Badan Kesatuan Bangsa dan Politik Dalam Negeri Provinsi Nusa Tenggara Barat • Tahun Anggaran 2027
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="bg-white dark:bg-slate-800 px-5 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs text-left sm:text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pagu Indikatif Murni
                </span>
                <CurrencyText
                  amount={totalPaguOverall}
                  className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Badge variant="primary" size="sm" className="font-semibold shadow-2xs">
                  {programStats.length} Program Kegiatan
                </Badge>
                <Badge variant="neutral" size="sm" className="font-semibold shadow-2xs">
                  {totalSubKegiatanCount} Sub-Kegiatan
                </Badge>
              </div>
            </div>
          </div>

          {/* Cumulative Multi-Color Program Distribution Bar */}
          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Komposisi & Proporsi Alokasi Belanja Antar Program
              </span>
              <span className="font-mono text-[11px] text-slate-500 font-medium">
                100% Teralokasi
              </span>
            </div>

            {/* Stacked Bar */}
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden flex shadow-inner">
              {programStats.map((prog, idx) => {
                const theme = PROGRAM_THEMES[idx % PROGRAM_THEMES.length];
                return (
                  <div
                    key={prog.nama}
                    style={{ width: `${Math.max(prog.percentage, 1)}%` }}
                    className={`${theme.barColor} transition-all relative group cursor-pointer`}
                    title={`${prog.nama}: ${prog.percentage.toFixed(2)}% (${prog.totalPagu.toLocaleString('id-ID')})`}
                  />
                );
              })}
            </div>

            {/* Compact Legend Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-1">
              {programStats.map((prog, idx) => {
                const theme = PROGRAM_THEMES[idx % PROGRAM_THEMES.length];
                return (
                  <div
                    key={prog.nama}
                    onClick={() => onSelectProgram && onSelectProgram(prog.nama)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border ${theme.borderColor} ${theme.badgeBg} font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer`}
                  >
                    <span className={`w-2 h-2 rounded-full ${theme.barColor}`} />
                    <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white">
                      {prog.kode || `P${idx + 1}`}
                    </span>
                    <span className="font-semibold">{prog.percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Section "Nama Program dan Anggarannya (di dalamnya terdapat persentase anggaran masing-masing program)" */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Nama Program dan Anggarannya
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300/60 dark:border-emerald-800">
              {programStats.length} Program
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline-block">
            Dilengkapi persentase kontribusi terhadap Total Anggaran SKPD
          </span>
        </div>

        {/* Responsive Grid of Program Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programStats.map((prog, idx) => {
            const theme = PROGRAM_THEMES[idx % PROGRAM_THEMES.length];

            return (
              <div
                key={prog.nama}
                onClick={() => onSelectProgram && onSelectProgram(prog.nama)}
                className={`rounded-2xl border ${theme.borderColor} ${theme.hoverGlow} bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden`}
              >
                {/* Accent top stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.barColor}`} />

                <div>
                  {/* Top Header: Program Code & Percentage Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border ${theme.badgeBg} ${theme.badgeText}`}
                    >
                      {prog.kode || `PROGRAM ${idx + 1}`}
                    </span>

                    <div
                      className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full ${theme.percentBadge} shadow-2xs`}
                      title={`Persentase anggaran: ${prog.percentage.toFixed(2)}% dari Total SKPD`}
                    >
                      <Percent className="w-3 h-3" />
                      <span>{prog.percentage.toFixed(2)}%</span>
                    </div>
                  </div>

                  {/* Program Title */}
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-3 min-h-[3rem]">
                    {prog.nama}
                  </h4>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                  {/* Nominal Anggaran Program */}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Alokasi Anggaran:
                    </span>
                    <CurrencyText
                      amount={prog.totalPagu}
                      className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  {/* Progress Bar of Program Allocation */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(prog.percentage, 100)}%` }}
                        className={`h-full ${theme.barColor} rounded-full transition-all`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{prog.subCount} Sub-Kegiatan</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {prog.percentage.toFixed(2)}% dari Total SKPD
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
