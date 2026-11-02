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
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  FolderTree,
  LayoutList,
  Briefcase,
  Layers3,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { CurrencyText } from '../atoms/CurrencyText';
import { SearchBar } from '../molecules/SearchBar';
import { EmptyState } from '../molecules/EmptyState';
import { SubKegiatan, KeteranganSubBl } from '../../types/budget';

export interface SubKegiatanSummaryTableProps {
  subKegiatans: SubKegiatan[];
  onSelectSubKegiatan: (subKegiatan: SubKegiatan) => void;
  onAddNewSubKegiatan?: () => void;
  onDeleteSubKegiatan?: (subKegiatan: SubKegiatan) => void;
  externalSelectedProgram?: string;
  onProgramChange?: (program: string) => void;
}

interface KegiatanGroup {
  kode_kegiatan: string;
  nama_kegiatan: string;
  totalPagu: number;
  subKegiatans: SubKegiatan[];
}

interface ProgramGroup {
  kode_program: string;
  nama_program: string;
  totalPagu: number;
  subCount: number;
  withRincianCount: number;
  kegiatans: KegiatanGroup[];
  subKegiatans: SubKegiatan[];
}

export const SubKegiatanSummaryTable: React.FC<SubKegiatanSummaryTableProps> = ({
  subKegiatans,
  onSelectSubKegiatan,
  onAddNewSubKegiatan,
  onDeleteSubKegiatan,
  externalSelectedProgram,
  onProgramChange,
}) => {
  // View mode: 'grouped' (default as requested by user) or 'flat'
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>(externalSelectedProgram || 'all');
  const [rincianFilter, setRincianFilter] = useState<'all' | 'with_rincian' | 'without_rincian'>('all');

  // Sync external program selection if provided
  React.useEffect(() => {
    if (externalSelectedProgram !== undefined) {
      setSelectedProgram(externalSelectedProgram);
    }
  }, [externalSelectedProgram]);

  const handleProgramSelect = (prog: string) => {
    setSelectedProgram(prog);
    onProgramChange?.(prog);
  };

  // Package expansion within sub-kegiatan
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});

  // Program group expansion: true by default for all programs
  const [collapsedPrograms, setCollapsedPrograms] = useState<Record<string, boolean>>({});

  // Pagination for flat table mode
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const toggleExpandSub = (subId: string) => {
    setExpandedSubs((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  const isProgramExpanded = (progName: string) => {
    return !collapsedPrograms[progName];
  };

  const toggleProgramExpanded = (progName: string) => {
    setCollapsedPrograms((prev) => ({
      ...prev,
      [progName]: !prev[progName],
    }));
  };

  // Program options list for filter dropdown
  const programOptions = useMemo(() => {
    const map = new Map<string, { kode: string; nama: string; count: number; totalPagu: number }>();
    subKegiatans.forEach((s) => {
      const progName = s.nama_program || 'Lainnya';
      const existing = map.get(progName) || {
        kode: s.kode_program || '',
        nama: progName,
        count: 0,
        totalPagu: 0,
      };
      existing.count += 1;
      existing.totalPagu += s.pagu_indikatif || 0;
      if (!existing.kode && s.kode_program) existing.kode = s.kode_program;
      map.set(progName, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.kode && b.kode) return a.kode.localeCompare(b.kode);
      return a.nama.localeCompare(b.nama);
    });
  }, [subKegiatans]);

  // Counts
  const withRincianCount = useMemo(() => {
    return subKegiatans.filter((s) => (s.rincian_count ?? 0) > 0).length;
  }, [subKegiatans]);

  // Filter sub-kegiatans
  const filteredList = useMemo(() => {
    return subKegiatans.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        item.nama_sub_kegiatan.toLowerCase().includes(q) ||
        item.kode_sub_kegiatan.toLowerCase().includes(q) ||
        item.nama_program?.toLowerCase().includes(q) ||
        item.nama_giat?.toLowerCase().includes(q) ||
        item.nama_kegiatan?.toLowerCase().includes(q) ||
        item.nama_skpd?.toLowerCase().includes(q) ||
        String(item.id_sub_bl).includes(q) ||
        (item.keterangan_list?.[0]?.ket_bl_teks?.toLowerCase().includes(q) ?? false);

      const matchStatus =
        selectedStatus === 'all' || item.status_verifikasi === selectedStatus;

      const matchProgram =
        selectedProgram === 'all' || item.nama_program === selectedProgram;

      const hasRincian = (item.rincian_count ?? 0) > 0;
      const matchRincianFilter =
        rincianFilter === 'all'
          ? true
          : rincianFilter === 'with_rincian'
          ? hasRincian
          : !hasRincian;

      return matchSearch && matchStatus && matchProgram && matchRincianFilter;
    });
  }, [subKegiatans, search, selectedStatus, selectedProgram, rincianFilter]);

  // Hierarchical grouping by Program -> Kegiatan
  const programGroups = useMemo<ProgramGroup[]>(() => {
    const map = new Map<
      string,
      {
        kode_program: string;
        nama_program: string;
        subKegiatans: SubKegiatan[];
        kegiatansMap: Map<string, { kode_kegiatan: string; nama_kegiatan: string; subKegiatans: SubKegiatan[] }>;
      }
    >();

    filteredList.forEach((sub) => {
      const progKey = sub.nama_program || 'Program Lainnya';
      const progCode = sub.kode_program || '';

      if (!map.has(progKey)) {
        map.set(progKey, {
          kode_program: progCode,
          nama_program: progKey,
          subKegiatans: [],
          kegiatansMap: new Map(),
        });
      }

      const prog = map.get(progKey)!;
      prog.subKegiatans.push(sub);
      if (!prog.kode_program && progCode) prog.kode_program = progCode;

      const giatKey = sub.nama_kegiatan || sub.nama_giat || 'Kegiatan Umum';
      const giatCode = sub.kode_kegiatan || sub.kode_giat || '';

      if (!prog.kegiatansMap.has(giatKey)) {
        prog.kegiatansMap.set(giatKey, {
          kode_kegiatan: giatCode,
          nama_kegiatan: giatKey,
          subKegiatans: [],
        });
      }
      prog.kegiatansMap.get(giatKey)!.subKegiatans.push(sub);
      if (!prog.kegiatansMap.get(giatKey)!.kode_kegiatan && giatCode) {
        prog.kegiatansMap.get(giatKey)!.kode_kegiatan = giatCode;
      }
    });

    return Array.from(map.values())
      .map((prog) => {
        const totalPagu = prog.subKegiatans.reduce((sum, s) => sum + (s.pagu_indikatif || 0), 0);
        const withRincianInProg = prog.subKegiatans.filter((s) => (s.rincian_count ?? 0) > 0).length;

        const kegiatans: KegiatanGroup[] = Array.from(prog.kegiatansMap.values())
          .map((k) => ({
            kode_kegiatan: k.kode_kegiatan,
            nama_kegiatan: k.nama_kegiatan,
            totalPagu: k.subKegiatans.reduce((sum, s) => sum + (s.pagu_indikatif || 0), 0),
            subKegiatans: k.subKegiatans,
          }))
          .sort((a, b) => {
            if (a.kode_kegiatan && b.kode_kegiatan) return a.kode_kegiatan.localeCompare(b.kode_kegiatan);
            return a.nama_kegiatan.localeCompare(b.nama_kegiatan);
          });

        return {
          kode_program: prog.kode_program,
          nama_program: prog.nama_program,
          totalPagu,
          subCount: prog.subKegiatans.length,
          withRincianCount: withRincianInProg,
          kegiatans,
          subKegiatans: prog.subKegiatans,
        };
      })
      .sort((a, b) => {
        if (a.kode_program && b.kode_program) return a.kode_program.localeCompare(b.kode_program);
        return a.nama_program.localeCompare(b.nama_program);
      });
  }, [filteredList]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, selectedProgram, rincianFilter, pageSize]);

  // Paginated list for flat view
  const totalPages = Math.ceil(filteredList.length / (pageSize || 15)) || 1;
  const paginatedList = useMemo(() => {
    if (pageSize === 0) return filteredList;
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Expand / collapse all packages across visible items
  const areAllPackagesExpanded = useMemo(() => {
    const list = viewMode === 'grouped' ? filteredList : paginatedList;
    const subsWithPackages = list.filter((s) => (s.keterangan_list?.length ?? 0) > 0);
    return subsWithPackages.length > 0 && subsWithPackages.every((s) => expandedSubs[s.id]);
  }, [viewMode, filteredList, paginatedList, expandedSubs]);

  const toggleAllPackagesExpanded = () => {
    const list = viewMode === 'grouped' ? filteredList : paginatedList;
    if (areAllPackagesExpanded) {
      setExpandedSubs({});
    } else {
      const next: Record<string, boolean> = {};
      list.forEach((s) => {
        if ((s.keterangan_list?.length ?? 0) > 0) {
          next[s.id] = true;
        }
      });
      setExpandedSubs(next);
    }
  };

  // Expand / collapse all program sections
  const areAllProgramsExpanded = useMemo(() => {
    return programGroups.every((p) => isProgramExpanded(p.nama_program));
  }, [programGroups, collapsedPrograms]);

  const toggleAllPrograms = () => {
    if (areAllProgramsExpanded) {
      const next: Record<string, boolean> = {};
      programGroups.forEach((p) => {
        next[p.nama_program] = true; // mark collapsed
      });
      setCollapsedPrograms(next);
    } else {
      setCollapsedPrograms({}); // all expanded
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

  // Render single SubKegiatan Row (used in both Grouped table and Flat table)
  const renderSubKegiatanRow = (sub: SubKegiatan, rowIndex: number, showProgramCol = false) => {
    const hasRincian = (sub.rincian_count ?? 0) > 0;
    const isExpanded = !!expandedSubs[sub.id];
    const totalPaket = sub.keterangan_list?.length ?? 0;

    return (
      <tr
        key={sub.id}
        className="hover:bg-emerald-50/50 dark:hover:bg-slate-800/60 transition-colors group"
      >
        <td className="py-3.5 px-4 text-center font-medium text-slate-400">
          {rowIndex}
        </td>

        <td className="py-3.5 px-4">
          <div className="flex items-start gap-2.5">
            <div
              className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                hasRincian
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                  {sub.kode_sub_kegiatan || `ID ${sub.id_sub_bl}`}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: {sub.id_sub_bl}
                </span>
                {sub.id_sub_giat && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Giat: {sub.id_sub_giat}
                  </span>
                )}
                {hasRincian && (
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/90 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Rincian Aktif
                  </span>
                )}
              </div>

              <h4 className="font-semibold text-sm text-slate-900 dark:text-white mt-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                {sub.nama_sub_kegiatan}
              </h4>

              {/* Keterangan Sub Belanja dengan Opsi Ekstend / Collapse */}
              {sub.keterangan_list && sub.keterangan_list.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandSub(sub.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/70 border border-emerald-200/80 dark:border-emerald-800/60 transition-colors cursor-pointer group/toggle shadow-2xs"
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
              )}

              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {sub.nama_skpd || 'Badan Kesatuan Bangsa dan Politik Dalam Negeri'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Tahun {sub.tahun}
                </span>
              </div>
            </div>
          </div>
        </td>

        {showProgramCol && (
          <td className="py-3.5 px-4 hidden md:table-cell">
            <div className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-xs">
              {sub.nama_kegiatan || sub.nama_giat || '-'}
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
              {sub.nama_program || '-'}
            </div>
          </td>
        )}

        <td className="py-3.5 px-4 text-right">
          <CurrencyText
            amount={sub.pagu_indikatif}
            className="text-slate-900 dark:text-white font-semibold text-sm"
          />
          <div className="text-[10px] text-slate-400 mt-0.5">
            Pagu Indikatif
          </div>
        </td>

        <td className="py-3.5 px-4 text-center">
          <div className="inline-flex flex-col items-center">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                hasRincian
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Layers className="w-3 h-3" />
              {sub.rincian_count || 0} Item
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {sub.total_rincian ? (
                <CurrencyText amount={sub.total_rincian} compact />
              ) : (
                'Belum ada rincian'
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
              variant={hasRincian ? 'primary' : 'outline'}
              size="xs"
              onClick={() => onSelectSubKegiatan(sub)}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              iconPosition="right"
              className="shadow-xs text-xs font-semibold"
            >
              {hasRincian ? 'Buka Rincian' : 'Lihat / Buat'}
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
                title="Hapus Sub-Kegiatan ini"
                className="px-2"
              >
                Hapus
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      {/* Header section with title and mode toggle */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FolderTree className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Daftar Sub-Kegiatan Anggaran Berdasarkan Program
              </h2>
              <Badge variant="primary" size="xs">
                {subKegiatans.length} Sub-Kegiatan
              </Badge>
              <Badge variant="info" size="xs">
                {programOptions.length} Program
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data sub-kegiatan dikelompokkan secara hierarkis berdasarkan Program dan Kegiatan induk APBD TA 2027.
            </p>
          </div>

          {/* View mode toggle & Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600/70 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Kelompokkan data berdasarkan Program & Kegiatan"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Dikelompokkan per Program</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'flat'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilkan semua baris dalam satu tabel datar"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Tabel Datar</span>
              </button>
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
        </div>

        {/* Quick Tabs: Semua vs Ada Rincian */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700/80 pb-2 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setRincianFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
              rincianFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Semua Sub-Kegiatan ({subKegiatans.length})
          </button>
          <button
            type="button"
            onClick={() => setRincianFilter('with_rincian')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              rincianFilter === 'with_rincian'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Dengan Rincian Belanja ({withRincianCount})
          </button>
          <button
            type="button"
            onClick={() => setRincianFilter('without_rincian')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
              rincianFilter === 'without_rincian'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Belum Diinput Rincian ({subKegiatans.length - withRincianCount})
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari program, kegiatan, kode sub-kegiatan, nama, atau paket aktivitas..."
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Filter Program */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Program:</span>
              <select
                value={selectedProgram}
                onChange={(e) => handleProgramSelect(e.target.value)}
                className="text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[200px] truncate"
              >
                <option value="all">Semua Program ({programOptions.length})</option>
                {programOptions.map((prog) => (
                  <option key={prog.nama} value={prog.nama}>
                    {prog.kode ? `[${prog.kode}] ` : ''}
                    {prog.nama} ({prog.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1.5">
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

            {/* Expand / Collapse All Programs button (when in grouped view) */}
            {viewMode === 'grouped' && (
              <button
                type="button"
                onClick={toggleAllPrograms}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium shadow-2xs cursor-pointer"
                title={areAllProgramsExpanded ? 'Tutup semua grup program' : 'Buka semua grup program'}
              >
                <FolderKanban className="w-3.5 h-3.5 text-emerald-600" />
                <span>{areAllProgramsExpanded ? 'Tutup Semua Program' : 'Buka Semua Program'}</span>
              </button>
            )}

            {/* Expand / Collapse All Packages */}
            <button
              type="button"
              onClick={toggleAllPackagesExpanded}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium shadow-2xs cursor-pointer"
              title={areAllPackagesExpanded ? 'Ringkaskan tampilan semua paket' : 'Buka tampilan semua paket'}
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>{areAllPackagesExpanded ? 'Ringkaskan Paket' : 'Ekstend Paket'}</span>
            </button>
          </div>
        </div>

        {/* Program Quick Filter Chips / Pills */}
        <div className="pt-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pilih Cepat Program Kegiatan:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-thin">
            <button
              type="button"
              onClick={() => handleProgramSelect('all')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedProgram === 'all'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
              }`}
            >
              Semua Program ({subKegiatans.length})
            </button>

            {programOptions.map((prog) => {
              const isSelected = selectedProgram === prog.nama;
              return (
                <button
                  key={prog.nama}
                  type="button"
                  onClick={() => handleProgramSelect(isSelected ? 'all' : prog.nama)}
                  className={`px-3 py-1.5 rounded-lg border text-xs shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                  }`}
                  title={`${prog.nama} - ${prog.count} Sub-Kegiatan`}
                >
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-emerald-800 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {prog.kode || 'PROG'}
                  </span>
                  <span className="font-medium max-w-[220px] truncate text-left">
                    {prog.nama.replace(/^PROGRAM\s+/i, '')}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {prog.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredList.length === 0 ? (
        <EmptyState
          title="Tidak ada sub-kegiatan yang cocok"
          description="Coba ubah kata kunci pencarian atau reset filter program Anda."
          actionLabel="Reset Semua Filter"
          onAction={() => {
            setSearch('');
            setSelectedStatus('all');
            setSelectedProgram('all');
            setRincianFilter('all');
          }}
        />
      ) : viewMode === 'grouped' ? (
        /* ================= GROUPED BY PROGRAM & KEGIATAN VIEW ================= */
        <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
          {programGroups.map((group, groupIdx) => {
            const isExpanded = isProgramExpanded(group.nama_program);

            return (
              <div key={group.nama_program} className="transition-colors">
                {/* Program Header Banner */}
                <div
                  onClick={() => toggleProgramExpanded(group.nama_program)}
                  className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-900 border-b border-emerald-100 dark:border-slate-700/80 cursor-pointer hover:from-emerald-100/70 hover:to-teal-50/70 transition-all group/prog flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs mt-0.5 shrink-0">
                      <FolderTree className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {group.kode_program && (
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-800 text-white shadow-2xs">
                            {group.kode_program}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                          Program Kegiatan ({groupIdx + 1} dari {programGroups.length})
                        </span>
                        <Badge variant="primary" size="xs">
                          {group.subCount} Sub-Kegiatan
                        </Badge>
                        {group.withRincianCount > 0 && (
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {group.withRincianCount} Ada Rincian
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 group-hover/prog:text-emerald-700 dark:group-hover/prog:text-emerald-400 transition-colors">
                        {group.nama_program}
                      </h3>

                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>{group.kegiatans.length} Kegiatan Induk</span>
                        <span>•</span>
                        <span>Provinsi NTB (TA 2027)</span>
                      </div>
                    </div>
                  </div>

                  {/* Program Total Pagu & Collapse Button */}
                  <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                    <div className="text-right bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Total Pagu Program
                      </span>
                      <CurrencyText
                        amount={group.totalPagu}
                        className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono"
                      />
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 group-hover/prog:bg-emerald-200 transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-Kegiatan List within this Program (Grouped by Kegiatan) */}
                {isExpanded && (
                  <div className="p-3 sm:p-5 bg-white dark:bg-slate-900/60 space-y-6">
                    {group.kegiatans.map((kegiatan, kIdx) => (
                      <div
                        key={kegiatan.nama_kegiatan + kIdx}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs bg-white dark:bg-slate-900"
                      >
                        {/* Kegiatan Sub-Header */}
                        <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            {kegiatan.kode_kegiatan && (
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                {kegiatan.kode_kegiatan}
                              </span>
                            )}
                            <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                              <span className="text-slate-500 dark:text-slate-400 font-normal mr-1">Kegiatan:</span>
                              {kegiatan.nama_kegiatan}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 font-medium">
                              {kegiatan.subKegiatans.length} Sub-Kegiatan
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              <CurrencyText amount={kegiatan.totalPagu} />
                            </span>
                          </div>
                        </div>

                        {/* Table for this Kegiatan's sub-kegiatans */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                                <th className="py-2.5 px-4 w-12 text-center">No</th>
                                <th className="py-2.5 px-4 min-w-[340px]">Sub-Kegiatan & Paket Keterangan Belanja</th>
                                <th className="py-2.5 px-4 min-w-[140px] text-right">Pagu Indikatif</th>
                                <th className="py-2.5 px-4 min-w-[120px] text-center">Rincian Belanja</th>
                                <th className="py-2.5 px-4 w-28 text-center">Status</th>
                                <th className="py-2.5 px-4 w-44 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                              {kegiatan.subKegiatans.map((sub, sIdx) =>
                                renderSubKegiatanRow(sub, sIdx + 1, false)
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= FLAT TABLE VIEW ================= */
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
              {paginatedList.map((sub, idx) => {
                const globalIndex = pageSize ? (currentPage - 1) * pageSize + idx + 1 : idx + 1;
                return renderSubKegiatanRow(sub, globalIndex, true);
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer info & Pagination (in flat mode) */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <span>
            {viewMode === 'grouped' ? (
              <>
                Menampilkan <b>{filteredList.length}</b> Sub-Kegiatan dalam{' '}
                <b>{programGroups.length}</b> Program Kegiatan
              </>
            ) : (
              <>
                Menampilkan{' '}
                <b>
                  {pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1}
                </b>
                -
                <b>
                  {pageSize === 0
                    ? filteredList.length
                    : Math.min(currentPage * pageSize, filteredList.length)}
                </b>{' '}
                dari <b>{filteredList.length}</b> Sub-Kegiatan
              </>
            )}
          </span>

          {viewMode === 'flat' && (
            <>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1">
                <span>Per halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-xs border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={0}>Semua (51)</option>
                </select>
              </span>
            </>
          )}
        </div>

        {viewMode === 'flat' && pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Sebelumnya
            </Button>

            <span className="px-2.5 py-1 text-slate-600 dark:text-slate-400 font-medium">
              Halaman {currentPage} dari {totalPages}
            </span>

            <Button
              variant="outline"
              size="xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
              iconPosition="right"
            >
              Berikutnya
            </Button>
          </div>
        )}

        {viewMode === 'grouped' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={toggleAllPrograms}
              icon={<FolderKanban className="w-3.5 h-3.5" />}
            >
              {areAllProgramsExpanded ? 'Tutup Semua Program' : 'Buka Semua Program'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
