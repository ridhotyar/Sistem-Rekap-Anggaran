import React from 'react';
import { Layers, Info, Calendar, MapPin, Building, Plus } from 'lucide-react';
import { SubKegiatanSummaryTable } from '../organisms/SubKegiatanSummaryTable';
import { SubKegiatanMetricsOverview } from '../organisms/SubKegiatanMetricsOverview';
import { SubKegiatan, RincianBelanjaItem } from '../../types/budget';

export interface SubKegiatanListPageProps {
  subKegiatans: SubKegiatan[];
  rincianItems?: RincianBelanjaItem[];
  onSelectSubKegiatan: (subKegiatan: SubKegiatan) => void;
  onAddNewSubKegiatan?: () => void;
  onDeleteSubKegiatan?: (subKegiatan: SubKegiatan) => void;
  isAdmin?: boolean;
}

export const SubKegiatanListPage: React.FC<SubKegiatanListPageProps> = ({
  subKegiatans,
  rincianItems = [],
  onSelectSubKegiatan,
  onAddNewSubKegiatan,
  onDeleteSubKegiatan,
  isAdmin = true,
}) => {
  const [selectedProgram, setSelectedProgram] = React.useState<string>('all');

  return (
    <div className="space-y-6">
      {/* Hero / Header Banner */}
      {/* <div className="rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
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
      </div> */}

      {/* Overview: Total Anggaran SKPD & Nama Program dan Anggarannya */}
      <SubKegiatanMetricsOverview
        items={rincianItems}
        allSubKegiatans={subKegiatans}
        isDetailedView={false}
        selectedProgram={selectedProgram}
        onSelectProgram={(prog) => setSelectedProgram(prog)}
      />

      {/* Summary Table */}
      <div id="daftar-program" className="scroll-mt-24">
        <SubKegiatanSummaryTable
          subKegiatans={subKegiatans}
          rincianItems={rincianItems}
          onSelectSubKegiatan={onSelectSubKegiatan}
          onAddNewSubKegiatan={onAddNewSubKegiatan}
          onDeleteSubKegiatan={onDeleteSubKegiatan}
          externalSelectedProgram={selectedProgram}
          onProgramChange={(prog) => setSelectedProgram(prog)}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
};
