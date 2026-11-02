import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  ArrowRight,
  Plus,
  Building2,
  Calendar,
  Layers,
  Search,
  Filter,
  Tag,
  FileCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  ChevronsUpDown,
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { CurrencyText } from '../atoms/CurrencyText';
import { SearchBar } from '../molecules/SearchBar';
import { EmptyState } from '../molecules/EmptyState';
import { SubKegiatan } from '../../types/budget';

export interface SubKegiatanSummaryTableProps {
  subKegiatans: SubKegiatan[];
  onSelectSubKegiatan: (subKegiatan: SubKegiatan) => void;
  onAddNewSubKegiatan?: () => void;
  onDeleteSubKegiatan?: (subKegiatan: SubKegiatan) => void;
}

export const SubKegiatanSummaryTable: React.FC<SubKegiatanSummaryTableProps> = ({
  subKegiatans,
  onSelectSubKegiatan,
  onAddNewSubKegiatan,
  onDeleteSubKegiatan,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});

  const toggleExpandSub = (subId: string) => {
    setExpandedSubs((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  // Filter sub-kegiatans
  const filteredList = useMemo(() => {
    return subKegiatans.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        item.nama_sub_kegiatan.toLowerCase().includes(q) ||
        item.kode_sub_kegiatan.toLowerCase().includes(q) ||
        item.nama_program?.toLowerCase().includes(q) ||
        item.nama_giat?.toLowerCase().includes(q) ||
        item.nama_skpd?.toLowerCase().includes(q) ||
        String(item.id_sub_bl).includes(q) ||
        (item.keterangan_list?.[0]?.ket_bl_teks?.toLowerCase().includes(q) ?? false);

      const matchStatus =
        selectedStatus === 'all' || item.status_verifikasi === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [subKegiatans, search, selectedStatus]);

  const areAllExpanded = useMemo(() => {
    const subsWithPackages = filteredList.filter((s) => (s.keterangan_list?.length ?? 0) > 0);
    return subsWithPackages.length > 0 && subsWithPackages.every((s) => expandedSubs[s.id]);
  }, [filteredList, expandedSubs]);

  const toggleAllExpanded = () => {
    if (areAllExpanded) {
      setExpandedSubs({});
    } else {
      const next: Record<string, boolean> = {};
      filteredList.forEach((s) => {
        if ((s.keterangan_list?.length ?? 0) > 0) {
          next[s.id] = true;
        }
      });
      setExpandedSubs(next);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Disetujui':
        return <Badge variant="success" dot size="xs">Disetujui</Badge>;
      case 'Divalidasi':
        return <Badge variant="info" dot size="xs">Divalidasi</Badge>;
      case 'Draft':
      default:
        return <Badge variant="warning" dot size="xs">Draft</Badge>;
    }
  };

  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      {/* Header section */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Rangkuman Daftar Sub-Kegiatan Anggaran
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rangkuman daftar sub-kegiatan APBD dan paket aktivitas. Pilih sub-kegiatan untuk masuk ke rincian belanja.
            </p>
          </div>

          {onAddNewSubKegiatan && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAddNewSubKegiatan}
              icon={<Plus className="w-4 h-4" />}
            >
              Tambah Sub-Kegiatan
            </Button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari kode sub-kegiatan, nama, SKPD, program, atau paket..."
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={toggleAllExpanded}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium shadow-2xs cursor-pointer"
              title={areAllExpanded ? 'Ringkaskan tampilan semua paket' : 'Buka tampilan semua paket'}
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>{areAllExpanded ? 'Ringkaskan Semua Paket' : 'Ekstend Semua Paket'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Status</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Divalidasi">Divalidasi</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      {filteredList.length === 0 ? (
        <EmptyState
          title="Tidak ada sub-kegiatan yang cocok"
          description="Coba ubah kata kunci pencarian Anda."
          actionLabel="Reset Pencarian"
          onAction={() => {
            setSearch('');
            setSelectedStatus('all');
          }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 min-w-[320px]">Sub-Kegiatan & Paket Keterangan Belanja</th>
                <th className="py-3 px-4 min-w-[240px] hidden md:table-cell">Program & Kegiatan Induk</th>
                <th className="py-3 px-4 min-w-[140px] text-right">Pagu Indikatif</th>
                <th className="py-3 px-4 min-w-[120px] text-center">Rincian Belanja</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 w-44 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {filteredList.map((sub, idx) => {
                const ketTeks = sub.keterangan_list?.[0]?.ket_bl_teks;

                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 mt-0.5 shrink-0">
                          <FolderKanban className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded">
                              {sub.kode_sub_kegiatan}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {sub.id_sub_bl}
                            </span>
                            {sub.id_sub_giat && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Giat: {sub.id_sub_giat}
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                            {sub.nama_sub_kegiatan}
                          </h3>

                          {/* Tampilkan Keterangan Sub Belanja dengan Opsi Ekstend / Collapse (Ringkas) */}
                          {sub.keterangan_list && sub.keterangan_list.length > 0 && (() => {
                            const isExpanded = !!expandedSubs[sub.id];
                            const totalPaket = sub.keterangan_list.length;

                            return (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandSub(sub.id);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/70 border border-emerald-200/80 dark:border-emerald-800/60 transition-colors cursor-pointer group/toggle shadow-2xs"
                                    title={isExpanded ? 'Klik untuk meringkaskan tampilan paket' : 'Klik untuk mengekstend dan melihat nominal masing-masing paket'}
                                  >
                                    <Package className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>
                                      {totalPaket > 1
                                        ? `Keterangan Sub Belanja (${totalPaket} Paket Aktivitas):`
                                        : 'Keterangan Sub Belanja:'}
                                    </span>
                                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 font-medium ml-0.5">
                                      {isExpanded ? 'Tutup Ringkas' : 'Ekstend Paket'}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
                                    )}
                                  </button>

                                  {!isExpanded && (
                                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                      Total Pagu:
                                      <CurrencyText
                                        amount={sub.pagu_indikatif}
                                        className="font-semibold text-emerald-700 dark:text-emerald-400"
                                      />
                                    </span>
                                  )}
                                </div>

                                {/* Tampilan Ringkas (Saat di-collapse) */}
                                {!isExpanded && (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandSub(sub.id);
                                    }}
                                    className="mt-1.5 p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-slate-800/60 transition-colors group/ringkas"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                      <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate">
                                        {sub.keterangan_list[0]?.ket_bl_teks}
                                      </span>
                                      {totalPaket > 1 && (
                                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950 px-1.5 py-0.5 rounded shrink-0">
                                          +{totalPaket - 1} paket lainnya
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 flex items-center gap-1 group-hover/ringkas:underline">
                                      Lihat Nominal Paket <ChevronDown className="w-3 h-3" />
                                    </span>
                                  </div>
                                )}

                                {/* Tampilan Terbuka (Saat di-ekstend): Tampilkan nominal masing-masing paket & hilangkan ID paket */}
                                {isExpanded && (
                                  <div className="mt-2 space-y-1.5 pl-0.5">
                                    {sub.keterangan_list.map((ket, kIdx) => {
                                      const nominal =
                                        ket.total_pagu !== undefined && ket.total_pagu > 0
                                          ? ket.total_pagu
                                          : sub.keterangan_list!.length === 1
                                          ? sub.pagu_indikatif
                                          : 0;

                                      return (
                                        <div
                                          key={ket.id_unik || ket.id_ket_sub_bl || kIdx}
                                          className="flex items-center justify-between gap-3 text-[11px] text-slate-900 dark:text-slate-100 bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                                        >
                                          {/* HILANGKAN TAMPILAN ID PAKET - gunakan penomoran bersih dan nama paket */}
                                          <div className="flex items-start gap-2 min-w-0 flex-1">
                                            <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                              {kIdx + 1}
                                            </span>
                                            <div className="min-w-0">
                                              <span className="font-semibold block text-slate-900 dark:text-white leading-snug break-words">
                                                {ket.ket_bl_teks}
                                              </span>
                                              {ket.rincian_count ? (
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                  {ket.rincian_count} rincian belanja
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>

                                          {/* TAMPILKAN NOMINAL DARI MASING-MASING PAKET */}
                                          <div className="text-right shrink-0 bg-white dark:bg-slate-900/90 px-2.5 py-1.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">
                                              Nominal Paket
                                            </span>
                                            <CurrencyText
                                              amount={nominal}
                                              className="font-bold text-xs text-emerald-700 dark:text-emerald-400 font-mono"
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {sub.nama_skpd || 'Badan Kesatuan Bangsa dan Politik'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Tahun {sub.tahun}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell">
                      <div className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-xs">
                        {sub.nama_kegiatan || sub.nama_giat || '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                        {sub.nama_program || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <CurrencyText
                        amount={sub.pagu_indikatif}
                        className="text-slate-900 dark:text-white font-semibold text-sm"
                      />
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Alokasi Pagu
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          <Layers className="w-3 h-3 text-emerald-600" />
                          {sub.rincian_count || 0} Item
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {sub.total_rincian ? (
                            <CurrencyText amount={sub.total_rincian} compact />
                          ) : (
                            'Belum diinput'
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(sub.status_verifikasi)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => onSelectSubKegiatan(sub)}
                          icon={<ArrowRight className="w-3.5 h-3.5" />}
                          iconPosition="right"
                          className="shadow-xs"
                        >
                          Lihat Rincian
                        </Button>
                        {onDeleteSubKegiatan && (
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSubKegiatan(sub);
                            }}
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            title="Hapus Sub-Kegiatan ini beserta rincian belanjanya"
                            className="px-2"
                          >
                            Hapus
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
