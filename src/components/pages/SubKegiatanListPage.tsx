import React from 'react';
import { Layers, Info, Calendar, MapPin, Building, Plus } from 'lucide-react';
import { SubKegiatanSummaryTable } from '../organisms/SubKegiatanSummaryTable';
import { SubKegiatanMetricsOverview } from '../organisms/SubKegiatanMetricsOverview';
import { SubKegiatan } from '../../types/budget';

export interface SubKegiatanListPageProps {
  subKegiatans: SubKegiatan[];
  onSelectSubKegiatan: (subKegiatan: SubKegiatan) => void;
  onAddNewSubKegiatan?: () => void;
  onDeleteSubKegiatan?: (subKegiatan: SubKegiatan) => void;
}

export const SubKegiatanListPage: React.FC<SubKegiatanListPageProps> = ({
  subKegiatans,
  onSelectSubKegiatan,
  onAddNewSubKegiatan,
  onDeleteSubKegiatan,
}) => {
  return (
    <div className="space-y-6">
      {/* Hero / Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30">
              <Layers className="w-3.5 h-3.5" />
              <span>Sistem Informasi Pemerintahan Daerah (SIPD)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Rangkuman Anggaran Belanja Sub-Kegiatan
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Daftar rekapitulasi sub-kegiatan APBD tahun anggaran 2027. Klik pada salah satu sub-kegiatan untuk melihat rincian item belanja, koefisien, dan standar satuan harga secara lengkap.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs">
            <div className="flex items-center gap-2 text-emerald-100">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Tahun Anggaran: <strong>2027</strong></span>
            </div>
            <div className="flex items-center gap-2 text-emerald-100">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>ID Daerah: <strong>407 (Provinsi NTB)</strong></span>
            </div>
            <div className="flex items-center gap-2 text-emerald-100">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>SKPD: <strong>Bakesbangpoldagri NTB</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <SubKegiatanMetricsOverview
        items={[]}
        allSubKegiatans={subKegiatans}
        isDetailedView={false}
      />

      {/* Educational info badge */}
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <strong>Filter Rincian Aktif:</strong> Hanya sub-kegiatan yang memiliki rincian belanja yang ditampilkan di sistem ini. Sub-kegiatan tanpa rincian otomatis tidak ditampilkan.
          </div>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-blue-200/70 dark:bg-blue-900/60 font-semibold text-[11px] shrink-0">
          {subKegiatans.length} Sub-Kegiatan Aktif
        </span>
      </div>
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="leading-relaxed">
          <strong>Struktur Hierarki Anggaran:</strong> Urusan Pemerintah &rarr; Program &rarr; Kegiatan &rarr; <strong>Sub-Kegiatan</strong> &rarr; <strong>Rincian Belanja (Rekening Akun & SSH)</strong>. Pilih sub-kegiatan di tabel rangkuman di bawah untuk membuka rincian belanja.
        </div>
      </div>

      {/* Summary Table */}
      <SubKegiatanSummaryTable
        subKegiatans={subKegiatans}
        onSelectSubKegiatan={onSelectSubKegiatan}
        onAddNewSubKegiatan={onAddNewSubKegiatan}
        onDeleteSubKegiatan={onDeleteSubKegiatan}
      />
    </div>
  );
};
