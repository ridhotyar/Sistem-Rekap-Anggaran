import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  FolderKanban,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Tag,
  Hash,
  Clock,
  Layers,
  Filter,
  Check,
  Trash2,
  Briefcase,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Card } from '../atoms/Card';
import { CurrencyText } from '../atoms/CurrencyText';
import { Breadcrumb } from '../molecules/Breadcrumb';
import { SubKegiatanMetricsOverview } from '../organisms/SubKegiatanMetricsOverview';
import { AkunDistributionChart } from '../organisms/AkunDistributionChart';
import { SubKegiatanRincianTable } from '../organisms/SubKegiatanRincianTable';
import { RincianItemFormModal } from '../organisms/RincianItemFormModal';
import { SubKegiatan, RincianBelanjaItem, KeteranganSubBl } from '../../types/budget';
import { INITIAL_KETERANGAN_LIST } from '../../data/initialBudgetData';
import { BASE_SUB_KEGIATAN_LIST } from '../../data/initialSubKegiatanData';

export interface SubKegiatanDetailPageProps {
  subKegiatan: SubKegiatan;
  items: RincianBelanjaItem[];
  onBackToSummary: () => void;
  onSaveItem: (item: RincianBelanjaItem) => Promise<void>;
  onDeleteItem: (item: RincianBelanjaItem) => Promise<void>;
  onDeleteSubKegiatan?: (subKegiatan: SubKegiatan) => void;
}

export const SubKegiatanDetailPage: React.FC<SubKegiatanDetailPageProps> = ({
  subKegiatan,
  items,
  onBackToSummary,
  onSaveItem,
  onDeleteItem,
  onDeleteSubKegiatan,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RincianBelanjaItem | null>(null);
  const [selectedKetId, setSelectedKetId] = useState<number | 'all'>('all');

  // Extract all distinct Keterangan Sub BL metadata
  const keteranganList = useMemo(() => {
    // 1. Start from subKegiatan.keterangan_list or fallback list
    const knownList = subKegiatan.keterangan_list?.length
      ? subKegiatan.keterangan_list
      : INITIAL_KETERANGAN_LIST.filter((k) => k.id_sub_bl === subKegiatan.id_sub_bl);

    // 2. Map every unique id_ket_sub_bl present in items
    const map = new Map<number, {
      keterangan: Partial<KeteranganSubBl>;
      itemCount: number;
      subtotal: number;
    }>();

    items.forEach((item) => {
      const ketId = item.id_ket_sub_bl;
      if (!map.has(ketId)) {
        const found = knownList.find((k) => k.id_ket_sub_bl === ketId);
        map.set(ketId, {
          keterangan: found || {
            id_ket_sub_bl: ketId,
            id_sub_bl: item.id_sub_bl,
            ket_bl_teks: item.ket_bl_teks || `Paket Keterangan Belanja #${ketId}`,
            tahun: item.tahun,
            id_daerah: item.id_daerah,
          },
          itemCount: 0,
          subtotal: 0,
        });
      }
      const entry = map.get(ketId)!;
      entry.itemCount += 1;
      entry.subtotal += item.total_harga || 0;
    });

    return Array.from(map.values());
  }, [subKegiatan, items]);

  // Filter items if a specific Keterangan is selected
  const filteredItems = useMemo(() => {
    if (selectedKetId === 'all') return items;
    return items.filter((i) => i.id_ket_sub_bl === selectedKetId);
  }, [items, selectedKetId]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: RincianBelanjaItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: RincianBelanjaItem) => {
    const confirmText = `Apakah Anda yakin ingin menghapus rincian belanja: "${item.spek}" (${item.nama_standar_harga})?`;
    if (window.confirm(confirmText)) {
      await onDeleteItem(item);
    }
  };

  // Find matching baseline data from 51 base sub-kegiatan list
  const baseSub = useMemo(() => {
    return (
      BASE_SUB_KEGIATAN_LIST.find((b) => b.id_sub_bl === subKegiatan.id_sub_bl) ||
      BASE_SUB_KEGIATAN_LIST.find((b) => b.id_sub_giat && b.id_sub_giat === subKegiatan.id_sub_giat) ||
      null
    );
  }, [subKegiatan]);

  // Ensure exact official code and values from base database
  const kodeSubKegiatan =
    baseSub?.kode_sub_kegiatan ||
    subKegiatan.kode_sub_kegiatan ||
    (subKegiatan as unknown as { kode_sub_giat?: string }).kode_sub_giat ||
    '8.01.02.1.01.0002';

  const namaSubKegiatan =
    baseSub?.nama_sub_kegiatan ||
    subKegiatan.nama_sub_kegiatan ||
    (subKegiatan as unknown as { nama_sub_giat?: string }).nama_sub_giat ||
    '-';

  const namaProgram =
    baseSub?.nama_program ||
    subKegiatan.nama_program ||
    'PROGRAM PENGUATAN IDEOLOGI PANCASILA DAN KARAKTER KEBANGSAAN';

  const kodeProgram =
    baseSub?.kode_program ||
    subKegiatan.kode_program ||
    '';

  const namaKegiatan =
    baseSub?.nama_kegiatan ||
    (baseSub as unknown as { nama_giat?: string })?.nama_giat ||
    subKegiatan.nama_kegiatan ||
    subKegiatan.nama_giat ||
    '-';

  const kodeKegiatan =
    baseSub?.kode_kegiatan ||
    (baseSub as unknown as { kode_giat?: string })?.kode_giat ||
    subKegiatan.kode_kegiatan ||
    subKegiatan.kode_giat ||
    '';

  const namaSkpd =
    baseSub?.nama_skpd ||
    (baseSub as unknown as { nama_unit?: string })?.nama_unit ||
    subKegiatan.nama_skpd ||
    subKegiatan.nama_unit ||
    'Badan Kesatuan Bangsa dan Politik Dalam Negeri';

  const kodeSkpd =
    baseSub?.kode_skpd ||
    subKegiatan.kode_skpd ||
    '8.01.0.00.0.00.01.0000';

  const namaDaerah =
    baseSub?.nama_daerah ||
    subKegiatan.nama_daerah ||
    'Provinsi Nusa Tenggara Barat';

  const tahunAnggaran =
    subKegiatan.tahun ||
    baseSub?.tahun ||
    2027;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Breadcrumb
          items={[
            {
              label: 'Rangkuman Sub-Kegiatan',
              onClick: onBackToSummary,
            },
            {
              label: `${kodeSubKegiatan} - ${namaSubKegiatan}`,
              active: true,
            },
          ]}
          onHomeClick={onBackToSummary}
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onDeleteSubKegiatan && (
            <Button
              variant="danger"
              size="xs"
              onClick={() => onDeleteSubKegiatan(subKegiatan)}
              icon={<Trash2 className="w-3.5 h-3.5" />}
              title="Hapus Sub-Kegiatan ini beserta seluruh rincian belanjanya"
            >
              Hapus Sub-Kegiatan
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            onClick={onBackToSummary}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Kembali ke Rangkuman
          </Button>
        </div>
      </div>

      {/* Official SIPD Sub-Kegiatan Profile Card */}
      <Card
        variant="default"
        padding="lg"
        className="bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border-emerald-500/20"
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-3.5 max-w-4xl">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {kodeSubKegiatan}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                ID Sub BL: {subKegiatan.id_sub_bl}
              </span>
              {subKegiatan.id_sub_giat && (
                <span className="text-xs text-slate-500 font-mono">
                  ID Sub Giat: {subKegiatan.id_sub_giat}
                </span>
              )}
              <Badge variant="success" size="xs" dot>
                {subKegiatan.status_verifikasi || 'Disetujui'}
              </Badge>
              <Badge variant="primary" size="xs">
                {namaDaerah}
              </Badge>
              <Badge variant="neutral" size="xs">
                {keteranganList.length} Keterangan Sub Belanja
              </Badge>
            </div>

            {/* Sub-kegiatan official title */}
            <div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                Sub-Kegiatan Belanja Langsung (APBD Murni {tahunAnggaran})
              </span>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                {namaSubKegiatan}
              </h1>
            </div>

            {/* Administrative Hierarchy details - Value-first presentation as requested */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
              {/* Program */}
              <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <FolderKanban className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Program
                  </span>
                  {kodeProgram && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {kodeProgram}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {namaProgram}
                </div>
              </div>

              {/* Kegiatan */}
              <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Kegiatan
                  </span>
                  {kodeKegiatan && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                      {kodeKegiatan}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {namaKegiatan}
                </div>
              </div>

              {/* SKPD */}
              <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    SKPD / Perangkat Daerah
                  </span>
                  {kodeSkpd && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                      {kodeSkpd}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {namaSkpd}
                </div>
              </div>

              {/* Pemerintah Daerah */}
              <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Pemerintah Daerah
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    Tahun Anggaran {tahunAnggaran}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {namaDaerah}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              icon={<Plus className="w-4 h-4" />}
            >
              Tambah Rincian Belanja
            </Button>
          </div>
        </div>

        {/* TAMPILKAN MASING-MASING KETERANGAN SUB BELANJA JIKA TERDAPAT LEBIH DARI 1 */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Daftar Keterangan Sub Belanja ({keteranganList.length} Paket Aktivitas)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Pilih salah satu paket di bawah untuk menyaring rincian belanja
            </span>
          </div>

          {/* Filter Pills for Multiple Keterangan */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedKetId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedKetId === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              Tampilkan Semua Paket ({items.length} Rincian)
            </button>

            {keteranganList.map((entry, pIdx) => {
              const isSelected = selectedKetId === entry.keterangan.id_ket_sub_bl;
              return (
                <button
                  key={entry.keterangan.id_ket_sub_bl}
                  onClick={() => setSelectedKetId(entry.keterangan.id_ket_sub_bl!)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-semibold text-[10px]">Paket {pIdx + 1}:</span>
                  <span className="truncate max-w-[200px]">{entry.keterangan.ket_bl_teks}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {entry.itemCount} item
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cards for EACH id_ket_sub_bl */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {keteranganList.map((entry, idx) => {
              const ket = entry.keterangan;
              const isSelected = selectedKetId === ket.id_ket_sub_bl;

              return (
                <div
                  key={ket.id_ket_sub_bl}
                  onClick={() =>
                    setSelectedKetId((prev) =>
                      prev === ket.id_ket_sub_bl ? 'all' : ket.id_ket_sub_bl!
                    )
                  }
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-white">
                        Paket #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Aktif
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {ket.ket_bl_teks}
                  </h4>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      {entry.itemCount} Rincian Belanja
                    </span>
                    <CurrencyText
                      amount={entry.subtotal}
                      className="font-extrabold text-emerald-800 dark:text-emerald-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* KPI Overview for currently filtered selection */}
      <SubKegiatanMetricsOverview
        subKegiatan={subKegiatan}
        items={filteredItems}
        isDetailedView={true}
      />

      {/* Distribution visual breakdown */}
      <AkunDistributionChart items={filteredItems} />

      {/* Itemized Rincian Table with Hierarchical Keterangan & Subs Grouping */}
      <SubKegiatanRincianTable
        items={filteredItems}
        onAddItem={handleOpenAdd}
        onEditItem={handleOpenEdit}
        onDeleteItem={handleDelete}
      />

      {/* Add / Edit Modal */}
      <RincianItemFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveItem}
        initialData={editingItem}
        idSubBl={subKegiatan.id_sub_bl}
        tahun={subKegiatan.tahun}
        idDaerah={subKegiatan.id_daerah}
      />
    </div>
  );
};
