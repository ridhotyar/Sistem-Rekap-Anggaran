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
import { getPagus } from './SubKegiatanSummaryTable';

export interface SubKegiatanMetricsOverviewProps {
  subKegiatan?: SubKegiatan;
  items: RincianBelanjaItem[];
  allSubKegiatans?: SubKegiatan[];
  isDetailedView?: boolean;
  onSelectProgram?: (programName: string) => void;
  selectedProgram?: string;
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
  selectedProgram = 'all',
}) => {
  const handleProgramCardClick = (programName: string) => {
    if (onSelectProgram) {
      onSelectProgram(programName);
    }

    // Scroll smoothly to the daftar program section
    setTimeout(() => {
      const target = document.getElementById('daftar-program');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // If in detailed view, calculate metrics for this specific sub-kegiatan
  if (isDetailedView && subKegiatan) {
    const totalRincian = items.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
    const uniqueAccounts = new Set(items.map((i) => i.kode_akun)).size;
    const { paguIndikatif, paguPerubahan, selisih, persen } = getPagus(subKegiatan);
    const balance = paguPerubahan - totalRincian;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Sebelum"
          value={<CurrencyText amount={paguIndikatif} />}
          subtitle={`APBD Murni TA ${subKegiatan.tahun}`}
          icon={<Wallet className="w-5 h-5" />}
          iconBgColor="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        />

        <StatCard
          title="Sesudah"
          value={<CurrencyText amount={paguPerubahan} />}
          subtitle={
            selisih !== 0
              ? `${selisih > 0 ? '+' : ''}${selisih.toLocaleString('id-ID')} (${selisih > 0 ? '+' : ''}${persen.toFixed(1)}%)`
              : 'Sama dengan anggaran sebelum'
          }
          icon={<Wallet className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          trend={{
            label: selisih !== 0 ? `${selisih > 0 ? '+' : ''}${persen.toFixed(1)}%` : 'Tetap (0%)',
            isPositive: selisih >= 0,
          }}
        />

        <StatCard
          title="Total Rincian Dibelanjakan"
          value={<CurrencyText amount={totalRincian} />}
          subtitle={
            balance === 0
              ? 'Pagu seimbang (100% teralokasi)'
              : balance > 0
              ? `Sisa pagu: ${balance.toLocaleString('id-ID')}`
              : 'Melebihi alokasi usulan'
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
      </div>
    );
  }

  // ================= SUMMARY VIEW =================
  const { totalPaguIndikatifOverall, totalPaguPerubahanOverall, selisihOverall, persenOverall } = useMemo(() => {
    let ind = 0;
    let per = 0;
    allSubKegiatans?.forEach((sub) => {
      const { paguIndikatif, paguPerubahan } = getPagus(sub);
      ind += paguIndikatif;
      per += paguPerubahan;
    });
    const sel = per - ind;
    const pct = ind > 0 ? (sel / ind) * 100 : 0;
    return {
      totalPaguIndikatifOverall: ind,
      totalPaguPerubahanOverall: per,
      selisihOverall: sel,
      persenOverall: pct,
    };
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
        totalPaguIndikatif: number;
        totalPaguPerubahan: number;
        selisih: number;
        persenSelisih: number;
        subCount: number;
        withRincianCount: number;
      }
    >();

    allSubKegiatans.forEach((sub) => {
      const progName = sub.nama_program || 'Program Lainnya';
      const existing = map.get(progName) || {
        kode: sub.kode_program || '',
        nama: progName,
        totalPaguIndikatif: 0,
        totalPaguPerubahan: 0,
        selisih: 0,
        persenSelisih: 0,
        subCount: 0,
        withRincianCount: 0,
      };

      const { paguIndikatif, paguPerubahan } = getPagus(sub);
      existing.totalPaguIndikatif += paguIndikatif;
      existing.totalPaguPerubahan += paguPerubahan;
      existing.subCount += 1;
      if ((sub.rincian_count ?? 0) > 0) {
        existing.withRincianCount += 1;
      }
      if (!existing.kode && sub.kode_program) existing.kode = sub.kode_program;
      map.set(progName, existing);
    });

    return Array.from(map.values())
      .map((p) => {
        const percentage = totalPaguIndikatifOverall > 0 ? (p.totalPaguIndikatif / totalPaguIndikatifOverall) * 100 : 0;
        const selisih = p.totalPaguPerubahan - p.totalPaguIndikatif;
        const persenSelisih = p.totalPaguIndikatif > 0 ? (selisih / p.totalPaguIndikatif) * 100 : 0;
        return {
          ...p,
          percentage,
          selisih,
          persenSelisih,
          totalPagu: p.totalPaguPerubahan,
        };
      })
      .sort((a, b) => {
        if (a.kode && b.kode) return a.kode.localeCompare(b.kode);
        return a.nama.localeCompare(b.nama);
      });
  }, [allSubKegiatans, totalPaguIndikatifOverall]);

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
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Badan Kesatuan Bangsa dan Politik Dalam Negeri Provinsi Nusa Tenggara Barat • Tahun Anggaran 2027
                  </p>
                </div>
              </div>  
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
              {/* Sebelum */}
              <div className="flex-1 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Sebelum
                </span>
                <CurrencyText
                  amount={totalPaguIndikatifOverall}
                  className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 font-mono tracking-tight"
                />
              </div>

              {/* Sesudah */}
              <div className="flex-1 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Sesudah
                </span>
                <CurrencyText
                  amount={totalPaguPerubahanOverall}
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight"
                />
              </div>

              {/* Selisih */}
              <div className="flex-1 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs text-left sm:text-right">
                <div className="flex items-center justify-between sm:justify-end gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Selisih
                  </span>
                  {selisihOverall !== 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        selisihOverall > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {selisihOverall > 0 ? '+' : ''}{persenOverall.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div
                  className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${
                    selisihOverall > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : selisihOverall < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {selisihOverall > 0 ? '+' : ''}
                  <CurrencyText
                    amount={selisihOverall}
                    className="inline text-lg sm:text-xl font-bold font-mono tracking-tight"
                  />
                </div>
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
                    onClick={() => handleProgramCardClick(prog.nama)}
                    className={`${theme.barColor} transition-all relative group cursor-pointer hover:opacity-80`}
                    title={`${prog.nama}: ${prog.percentage.toFixed(2)}% (Klik untuk scroll ke daftar program)`}
                  />
                );
              })}
            </div>

            {/* Compact Legend Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-1 w-full">
              {programStats.map((prog, idx) => {
                const theme = PROGRAM_THEMES[idx % PROGRAM_THEMES.length];
                const isSelected = selectedProgram === prog.nama;
                return (
                  <button
                    key={prog.nama}
                    type="button"
                    onClick={() => handleProgramCardClick(prog.nama)}
                    className={`flex-1 inline-flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-100/70 dark:bg-emerald-950 font-bold'
                        : `${theme.borderColor} ${theme.badgeBg} font-medium`
                    } text-slate-700 dark:text-slate-300 transition-all shadow-2xs cursor-pointer hover:shadow-xs`}
                    title={`Klik untuk memfilter dan scroll ke ${prog.nama}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${theme.barColor}`} />
                      <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white">
                        {prog.kode || `P${idx + 1}`}
                      </span>
                    </div>
                    <span className="font-semibold">{prog.percentage.toFixed(1)}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Section "Nama Program dan Anggarannya" */}
      <div className="hidden">
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
            Klik kartu program untuk filter & langsung scroll ke daftar di bawah ↓
          </span>
        </div>
  
        {/* Responsive Grid of Program Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programStats.map((prog, idx) => {
            const theme = PROGRAM_THEMES[idx % PROGRAM_THEMES.length];
            const isSelected = selectedProgram === prog.nama;

            return (
              <div
                key={prog.nama}
                onClick={() => handleProgramCardClick(prog.nama)}
                className={`rounded-2xl border ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-md bg-emerald-50/10 dark:bg-emerald-950/20'
                    : `${theme.borderColor} ${theme.hoverGlow} bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md`
                } p-4 sm:p-5 transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden`}
                title={`Klik untuk memfilter dan scroll ke bagian daftar ${prog.nama}`}
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
                  {/* 3 Kolom Nominal: Sebelum, Sesudah, Selisih (Font sama, warna berbeda jika selisih) */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50/90 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-750">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Sebelum
                      </span>
                      <CurrencyText
                        amount={prog.totalPaguIndikatif}
                        className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono block truncate"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Sesudah
                      </span>
                      <CurrencyText
                        amount={prog.totalPaguPerubahan}
                        className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono block truncate"
                      />
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Selisih
                        </span>
                      </div>
                      {prog.selisih !== 0 ? (
                        <div
                          className={`text-xs font-bold font-mono truncate ${
                            prog.selisih > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                          title={`Selisih: ${prog.selisih > 0 ? '+' : ''}${prog.selisih.toLocaleString('id-ID')} (${prog.selisih > 0 ? '+' : ''}${prog.persenSelisih.toFixed(1)}%)`}
                        >
                          <span>{prog.selisih > 0 ? '+' : ''}</span>
                          <CurrencyText
                            amount={prog.selisih}
                            className="inline text-xs font-bold font-mono"
                          />
                          <span className="text-[9px] ml-0.5 block font-semibold">
                            ({prog.selisih > 0 ? '+' : ''}{prog.persenSelisih.toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold font-mono text-slate-400 dark:text-slate-500 block">
                          0 (0%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar of Program Allocation */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(prog.percentage, 100)}%` }}
                        className={`h-full ${theme.barColor} rounded-full transition-all`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-semibold transition-colors">
                        <span>
                          {prog.subCount} Sub-Kegiatan
                          {prog.withRincianCount > 0 ? ` (${prog.withRincianCount} Berincian)` : ''}
                        </span>
                        <span className="text-xs">&darr;</span>
                      </span>
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
