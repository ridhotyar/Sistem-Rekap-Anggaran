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
import { SubKegiatan, KeteranganSubBl, RincianBelanjaItem } from '../../types/budget';
import { BASE_SUB_KEGIATAN_LIST } from '../../data/initialSubKegiatanData';
import { Link } from '../../services/router';

export interface SubKegiatanSummaryTableProps {
  subKegiatans: SubKegiatan[];
  onSelectSubKegiatan: (subKegiatan: SubKegiatan) => void;
  onAddNewSubKegiatan?: () => void;
  onDeleteSubKegiatan?: (subKegiatan: SubKegiatan) => void;
  externalSelectedProgram?: string;
  onProgramChange?: (program: string) => void;
  isAdmin?: boolean;
  rincianItems?: RincianBelanjaItem[];
}

export const getPagus = (sub: SubKegiatan) => {
  const baseMatch = BASE_SUB_KEGIATAN_LIST.find((b) => Number(b.id_sub_bl) === Number(sub.id_sub_bl));
  // Pagu Indikatif (Sebelum): Harus selalu TETAP dari data dasar murni
  const paguIndikatif =
    baseMatch && baseMatch.pagu_indikatif > 0
      ? baseMatch.pagu_indikatif
      : sub.pagu_indikatif && sub.pagu_indikatif > 0
      ? sub.pagu_indikatif
      : 0;
  // Pagu Perubahan (Sesudah): Berubah HANYA ketika ada penyesuaian / update nominal aktual oleh user
  const paguPerubahan =
    sub.pagu_perubahan !== undefined
      ? sub.pagu_perubahan
      : paguIndikatif;
  const selisih = paguPerubahan - paguIndikatif;
  const persen = paguIndikatif > 0 ? (selisih / paguIndikatif) * 100 : 0;
  return { paguIndikatif, paguPerubahan, selisih, persen };
};

interface KegiatanGroup {
  kode_kegiatan: string;
  nama_kegiatan: string;
  totalPaguIndikatif: number;
  totalPaguPerubahan: number;
  selisih: number;
  persenSelisih: number;
  subKegiatans: SubKegiatan[];
}

interface ProgramGroup {
  kode_program: string;
  nama_program: string;
  totalPaguIndikatif: number;
  totalPaguPerubahan: number;
  selisih: number;
  persenSelisih: number;
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
  isAdmin = true,
  rincianItems = [],
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

  // Kegiatan group expansion: map kegiatanKey -> boolean (true if expanded)
  const [expandedKegiatans, setExpandedKegiatans] = useState<Record<string, boolean>>({});

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

  const isKegiatanExpanded = (kegiatanKey: string) => {
    // If user is searching, expand so matches are immediately visible
    if (search.trim() !== '') return true;
    return !!expandedKegiatans[kegiatanKey];
  };

  const toggleKegiatanExpanded = (kegiatanKey: string) => {
    setExpandedKegiatans((prev) => ({
      ...prev,
      [kegiatanKey]: !prev[kegiatanKey],
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
        let totalProgIndikatif = 0;
        let totalProgPerubahan = 0;
        const withRincianInProg = prog.subKegiatans.filter((s) => (s.rincian_count ?? 0) > 0).length;

        const kegiatans: KegiatanGroup[] = Array.from(prog.kegiatansMap.values())
          .map((k) => {
            let totalKegIndikatif = 0;
            let totalKegPerubahan = 0;

            k.subKegiatans.forEach((s) => {
              const { paguIndikatif, paguPerubahan } = getPagus(s);
              totalKegIndikatif += paguIndikatif;
              totalKegPerubahan += paguPerubahan;
            });

            totalProgIndikatif += totalKegIndikatif;
            totalProgPerubahan += totalKegPerubahan;

            const selisihKeg = totalKegPerubahan - totalKegIndikatif;
            const persenKeg = totalKegIndikatif > 0 ? (selisihKeg / totalKegIndikatif) * 100 : 0;

            return {
              kode_kegiatan: k.kode_kegiatan,
              nama_kegiatan: k.nama_kegiatan,
              totalPaguIndikatif: totalKegIndikatif,
              totalPaguPerubahan: totalKegPerubahan,
              selisih: selisihKeg,
              persenSelisih: persenKeg,
              subKegiatans: k.subKegiatans,
            };
          })
          .sort((a, b) => {
            if (a.kode_kegiatan && b.kode_kegiatan) return a.kode_kegiatan.localeCompare(b.kode_kegiatan);
            return a.nama_kegiatan.localeCompare(b.nama_kegiatan);
          });

        const selisihProg = totalProgPerubahan - totalProgIndikatif;
        const persenProg = totalProgIndikatif > 0 ? (selisihProg / totalProgIndikatif) * 100 : 0;

        return {
          kode_program: prog.kode_program,
          nama_program: prog.nama_program,
          totalPaguIndikatif: totalProgIndikatif,
          totalPaguPerubahan: totalProgPerubahan,
          selisih: selisihProg,
          persenSelisih: persenProg,
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

  // Expand / collapse all kegiatan sections
  const areAllKegiatansExpanded = useMemo(() => {
    let totalKeg = 0;
    let expCount = 0;
    programGroups.forEach((p) => {
      p.kegiatans.forEach((k) => {
        totalKeg++;
        const key = `${p.nama_program}__${k.kode_kegiatan || k.nama_kegiatan}`;
        if (isKegiatanExpanded(key)) expCount++;
      });
    });
    return totalKeg > 0 && expCount === totalKeg;
  }, [programGroups, expandedKegiatans, search]);

  const toggleAllKegiatans = () => {
    if (areAllKegiatansExpanded) {
      setExpandedKegiatans({});
    } else {
      const next: Record<string, boolean> = {};
      programGroups.forEach((p) => {
        p.kegiatans.forEach((k) => {
          const key = `${p.nama_program}__${k.kode_kegiatan || k.nama_kegiatan}`;
          next[key] = true;
        });
      });
      setExpandedKegiatans(next);
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
    const matchingSubItems = (rincianItems || []).filter(
      (item) => Number(item.id_sub_bl) === Number(sub.id_sub_bl)
    );
    const effectiveRincianCount =
      sub.rincian_count !== undefined && sub.rincian_count > 0
        ? sub.rincian_count
        : matchingSubItems.length;
    const effectiveTotalRincian =
      sub.total_rincian !== undefined && sub.total_rincian > 0
        ? sub.total_rincian
        : matchingSubItems.reduce((acc, curr) => acc + (curr.user_total_harga || curr.total_harga || 0), 0);
    const hasRincian = effectiveRincianCount > 0;
    const isExpanded = !!expandedSubs[sub.id];
    const totalPaket = sub.keterangan_list?.length ?? 0;
    const { paguIndikatif, paguPerubahan, selisih, persen } = getPagus(sub);

    return (
      <React.Fragment key={sub.id}>
        <tr
          className={`hover:bg-emerald-50/50 dark:hover:bg-slate-800/60 transition-colors group ${
            isExpanded ? 'bg-emerald-50/20 dark:bg-emerald-950/15' : ''
          }`}
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
                  {totalPaket > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandSub(sub.id);
                      }}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                        isExpanded
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                      }`}
                      title={isExpanded ? 'Tutup daftar paket belanja' : 'Buka daftar paket belanja'}
                    >
                      <Package className="w-3 h-3" />
                      <span>{totalPaket} Paket</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* Sub-Kegiatan Title */}
                <div
                  onClick={() => toggleExpandSub(sub.id)}
                  className="mt-1 cursor-pointer group/title"
                  title="Klik nama sub-kegiatan untuk membuka atau menutup daftar paket belanja"
                >
                  <span className="font-semibold text-sm text-slate-900 dark:text-white group-hover/title:text-emerald-700 dark:group-hover/title:text-emerald-400 transition-colors leading-snug block">
                    {sub.nama_sub_kegiatan}
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

          {/* Kolom Sebelum Sub-Kegiatan */}
          <td className="py-3.5 px-3.5 text-right whitespace-nowrap min-w-[125px]">
            <CurrencyText
              amount={paguIndikatif}
              className="text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm font-mono"
            />
          </td>

          {/* Kolom Sesudah Sub-Kegiatan */}
          <td className="py-3.5 px-3.5 text-right whitespace-nowrap min-w-[125px]">
            <CurrencyText
              amount={paguPerubahan}
              className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm font-mono"
            />
          </td>

          {/* Kolom Selisih Sub-Kegiatan */}
          <td className="py-3.5 px-3.5 text-right whitespace-nowrap min-w-[125px]">
            {selisih !== 0 ? (
              <div>
                <div
                  className={`text-xs sm:text-sm font-bold font-mono ${
                    selisih > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                  title={`Selisih: ${selisih > 0 ? '+' : ''}${selisih.toLocaleString('id-ID')} (${selisih > 0 ? '+' : ''}${persen.toFixed(1)}%)`}
                >
                  {selisih > 0 ? '+' : ''}
                  <CurrencyText amount={selisih} className="inline text-xs sm:text-sm font-bold font-mono" />
                </div>
                <div
                  className={`text-[10px] font-semibold mt-0.5 ${
                    selisih > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  ({selisih > 0 ? '+' : ''}{persen.toFixed(1)}%)
                </div>
              </div>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-mono text-xs sm:text-sm font-bold">
                0 (0%)
              </span>
            )}
          </td>

          <td className="py-3.5 px-2 w-20 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Link
                to={`/sub-kegiatan/${sub.id_sub_bl}`}
                onClick={() => onSelectSubKegiatan(sub)}
                className={`p-2 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center ${
                  hasRincian
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
                    : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
                title={hasRincian ? 'Buka rincian belanja sub-kegiatan' : 'Lihat / Buat rincian belanja sub-kegiatan'}
                aria-label={hasRincian ? 'Buka rincian belanja' : 'Lihat / Buat rincian'}
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
              {isAdmin && onDeleteSubKegiatan && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSubKegiatan(sub);
                  }}
                  className="p-2 rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/50 transition-colors inline-flex items-center justify-center cursor-pointer"
                  title="Hapus Sub-Kegiatan ini (Khusus Admin)"
                  aria-label="Hapus Sub-Kegiatan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* Baris Daftar Paket Belanja yang muncul ke bawah sejajar dengan Kolom Pagu Indikatif & Pagu Perubahan */}
        {isExpanded && sub.keterangan_list && sub.keterangan_list.length > 0 &&
          sub.keterangan_list.map((ket, kIdx) => {
            const pkgItems = matchingSubItems.filter((item) => {
              if (sub.keterangan_list && sub.keterangan_list.length === 1) return true;
              return (
                Number(item.id_ket_sub_bl) === Number(ket.id_ket_sub_bl) ||
                (item.ket_bl_teks && ket.ket_bl_teks && item.ket_bl_teks.trim().toLowerCase() === ket.ket_bl_teks.trim().toLowerCase())
              );
            });
            // Nilai Sebelum Paket: Total dasar murni rincian sebelum update user
            const pkgBaseTotal = pkgItems.reduce((acc, curr) => {
              if (curr.is_user_added) return acc;
              const basePrice = curr.base_total_harga !== undefined ? curr.base_total_harga : curr.total_harga || 0;
              return acc + basePrice;
            }, 0);

            // Cek apakah ada penyesuaian nominal aktual oleh user pada paket ini
            const hasUserAdj = pkgItems.some(
              (curr) =>
                (curr.user_total_harga !== undefined &&
                  curr.user_total_harga !== (curr.base_total_harga ?? curr.total_harga)) ||
                curr.is_user_added
            );

            // Nilai Sesudah Paket: Total rincian dengan penyesuaian user (jika belum diedit, sama persis dengan Sebelum)
            const pkgUpdatedTotal = hasUserAdj
              ? pkgItems.reduce((acc, curr) => {
                  const hasAdj = curr.user_total_harga !== undefined || curr.is_user_added;
                  const price = hasAdj ? curr.user_total_harga || 0 : (curr.base_total_harga ?? curr.total_harga) || 0;
                  return acc + price;
                }, 0)
              : pkgBaseTotal;

            const hasItems = pkgItems.length > 0;
            const pkgIndikatif = hasItems
              ? pkgBaseTotal
              : (ket as any).pagu_sebelum !== undefined
              ? (ket as any).pagu_sebelum
              : ket.total_pagu !== undefined && ket.total_pagu > 0
              ? ket.total_pagu
              : sub.keterangan_list && sub.keterangan_list.length === 1
              ? paguIndikatif
              : 0;

            const pkgPerubahan = hasItems
              ? pkgUpdatedTotal
              : (ket as any).pagu_sesudah !== undefined
              ? (ket as any).pagu_sesudah
              : pkgIndikatif;

            const pkgSelisih = pkgPerubahan - pkgIndikatif;
            const pkgPersen = pkgIndikatif > 0 ? (pkgSelisih / pkgIndikatif) * 100 : 0;

            return (
              <tr
                key={ket.id_unik || ket.id_ket_sub_bl || `${sub.id}-pkg-${kIdx}`}
                className="bg-emerald-50/40 dark:bg-emerald-950/25 border-b border-emerald-100/60 dark:border-slate-800/70 hover:bg-emerald-100/40 dark:hover:bg-emerald-900/30 transition-colors"
              >
                <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">↳</span>
                </td>

                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2.5 pl-3 sm:pl-5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center shrink-0 text-[10px] font-bold shadow-2xs">
                      {kIdx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block leading-snug">
                        {ket.ket_bl_teks}
                      </span>
                    </div>
                  </div>
                </td>

                {showProgramCol && (
                  <td className="py-2.5 px-4 hidden md:table-cell text-[11px] text-slate-400 italic">
                    -
                  </td>
                )}

                {/* Kolom Sebelum Paket */}
                <td className="py-2.5 px-3.5 text-right whitespace-nowrap min-w-[125px]">
                  <CurrencyText
                    amount={pkgIndikatif}
                    className="text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm font-mono"
                  />
                </td>

                {/* Kolom Sesudah Paket */}
                <td className="py-2.5 px-3.5 text-right whitespace-nowrap min-w-[125px]">
                  <CurrencyText
                    amount={pkgPerubahan}
                    className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm font-mono"
                  />
                </td>

                {/* Kolom Selisih Paket */}
                <td className="py-2.5 px-3.5 text-right whitespace-nowrap min-w-[125px]">
                  {pkgSelisih !== 0 ? (
                    <div>
                      <div
                        className={`text-xs sm:text-sm font-bold font-mono ${
                          pkgSelisih > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {pkgSelisih > 0 ? '+' : ''}
                        <CurrencyText amount={pkgSelisih} className="inline text-xs sm:text-sm font-bold font-mono" />
                      </div>
                      <div
                        className={`text-[9px] font-semibold mt-0.5 ${
                          pkgSelisih > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        ({pkgSelisih > 0 ? '+' : ''}{pkgPersen.toFixed(1)}%)
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-xs sm:text-sm font-bold">
                      0 (0%)
                    </span>
                  )}
                </td>

                {/* Kolom Aksi */}
                <td className="py-2.5 px-2 w-20 text-center">
                  <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                </td>
              </tr>
            );
          })}

        {isExpanded && (!sub.keterangan_list || sub.keterangan_list.length === 0) && (
          <tr key={`${sub.id}-empty`} className="bg-slate-50/50 dark:bg-slate-800/30">
            <td
              colSpan={showProgramCol ? 7 : 6}
              className="py-2.5 px-4 text-center text-xs text-slate-500 italic"
            >
              Belum ada paket keterangan belanja terdaftar.
            </td>
          </tr>
        )}
      </React.Fragment>
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
              <>
                <button
                  type="button"
                  onClick={toggleAllPrograms}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium shadow-2xs cursor-pointer"
                  title={areAllProgramsExpanded ? 'Tutup semua grup program' : 'Buka semua grup program'}
                >
                  <FolderTree className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{areAllProgramsExpanded ? 'Tutup Program' : 'Buka Program'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleAllKegiatans}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium shadow-2xs cursor-pointer"
                  title={areAllKegiatansExpanded ? 'Tutup semua daftar sub-kegiatan' : 'Buka semua daftar sub-kegiatan'}
                >
                  <FolderKanban className="w-3.5 h-3.5 text-teal-600" />
                  <span>{areAllKegiatansExpanded ? 'Tutup Kegiatan' : 'Buka Kegiatan'}</span>
                </button>
              </>
            )}

            {/* Expand / Collapse All Packages */}
            <button
              type="button"
              onClick={toggleAllPackagesExpanded}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium shadow-2xs cursor-pointer"
              title={areAllPackagesExpanded ? 'Tutup tampilan daftar paket' : 'Buka tampilan daftar paket'}
            >
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              <span>{areAllPackagesExpanded ? 'Tutup Paket' : 'Buka Paket'}</span>
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

                  {/* Program Total Pagu (Sebelum, Sesudah, Selisih) & Collapse Button */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center flex-wrap">
                    <div className="text-right bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs min-w-[110px]">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                        Sebelum
                      </span>
                      <CurrencyText
                        amount={group.totalPaguIndikatif}
                        className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 font-mono"
                      />
                    </div>

                    <div className="text-right bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs min-w-[110px]">
                      <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                        Sesudah
                      </span>
                      <CurrencyText
                        amount={group.totalPaguPerubahan}
                        className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div className="text-right bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs min-w-[115px]">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                          Selisih
                        </span>
                        {group.selisih !== 0 && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              group.selisih > 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {group.selisih > 0 ? '+' : ''}{group.persenSelisih.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-bold font-mono ${
                          group.selisih > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : group.selisih < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {group.selisih > 0 ? '+' : ''}
                        <CurrencyText
                          amount={group.selisih}
                          className="inline text-xs sm:text-sm font-bold font-mono"
                        />
                      </div>
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

                {/* Sub-Kegiatan List within this Program (Grouped by Kegiatan Dropdowns) */}
                {isExpanded && (
                  <div className="p-3 sm:p-5 bg-slate-50/60 dark:bg-slate-900/40 space-y-4">
                    {group.kegiatans.map((kegiatan, kIdx) => {
                      const kegiatanKey = `${group.nama_program}__${kegiatan.kode_kegiatan || kegiatan.nama_kegiatan}`;
                      const isKegExpanded = isKegiatanExpanded(kegiatanKey);

                      return (
                        <div
                          key={kegiatanKey}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs bg-white dark:bg-slate-900 transition-all"
                        >
                          {/* Kegiatan Dropdown Header: Klik untuk membuka/menutup daftar sub-kegiatan */}
                          <div
                            onClick={() => toggleKegiatanExpanded(kegiatanKey)}
                            className="p-3.5 sm:p-4 bg-gradient-to-r from-teal-50/70 via-slate-50/50 to-white dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 cursor-pointer hover:from-teal-100/70 hover:to-slate-100/70 dark:hover:from-slate-750 dark:hover:to-slate-800 transition-all group/keg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              <div className="p-2 rounded-xl bg-teal-600 dark:bg-teal-500 text-white shadow-2xs shrink-0 mt-0.5 sm:mt-0">
                                <FolderKanban className="w-4 h-4" />
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {kegiatan.kode_kegiatan && (
                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-800 text-white shadow-2xs">
                                      {kegiatan.kode_kegiatan}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
                                    Kegiatan Induk ({kIdx + 1} dari {group.kegiatans.length})
                                  </span>
                                  <Badge variant="neutral" size="xs">
                                    {kegiatan.subKegiatans.length} Sub-Kegiatan
                                  </Badge>
                                </div>

                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-1 group-hover/keg:text-teal-700 dark:group-hover/keg:text-teal-400 transition-colors">
                                  {kegiatan.nama_kegiatan}
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                              <div className="text-right bg-white dark:bg-slate-850 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs min-w-[100px]">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                                  Sebelum
                                </span>
                                <CurrencyText
                                  amount={kegiatan.totalPaguIndikatif}
                                  className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono"
                                />
                              </div>

                              <div className="text-right bg-white dark:bg-slate-850 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs min-w-[100px]">
                                <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                                  Sesudah
                                </span>
                                <CurrencyText
                                  amount={kegiatan.totalPaguPerubahan}
                                  className="text-xs font-bold text-slate-900 dark:text-white font-mono"
                                />
                              </div>

                              <div className="text-right bg-white dark:bg-slate-850 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs min-w-[105px]">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                    Selisih
                                  </span>
                                  {kegiatan.selisih !== 0 && (
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                        kegiatan.selisih > 0
                                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      }`}
                                    >
                                      {kegiatan.selisih > 0 ? '+' : ''}{kegiatan.persenSelisih.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-xs font-bold font-mono ${
                                    kegiatan.selisih > 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : kegiatan.selisih < 0
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-slate-400 dark:text-slate-500'
                                  }`}
                                >
                                  {kegiatan.selisih > 0 ? '+' : ''}
                                  <CurrencyText
                                    amount={kegiatan.selisih}
                                    className="inline text-xs font-bold font-mono"
                                  />
                                </div>
                              </div>

                              <div className="p-1.5 rounded-lg bg-teal-100/70 dark:bg-slate-700 text-teal-800 dark:text-teal-200 group-hover/keg:bg-teal-200 dark:group-hover/keg:bg-teal-800 transition-colors">
                                {isKegExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Table Sub-Kegiatan: Muncul saat dropdown Kegiatan dibuka */}
                          {isKegExpanded && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                                    <th className="py-2.5 px-4 min-w-[320px]">
                                      Sub-Kegiatan (Klik nama untuk melihat paket)
                                    </th>
                                    <th className="py-2.5 px-3.5 min-w-[125px] text-right">Sebelum</th>
                                    <th className="py-2.5 px-3.5 min-w-[125px] text-right">Sesudah</th>
                                    <th className="py-2.5 px-3.5 min-w-[125px] text-right">Selisih</th>
                                    <th className="py-2.5 px-2 w-20 text-center">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                                  {kegiatan.subKegiatans.map((sub, sIdx) =>
                                    renderSubKegiatanRow(sub, sIdx + 1, false)
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                <th className="py-3 px-4 min-w-[300px]">Sub-Kegiatan & Paket Keterangan Belanja</th>
                <th className="py-3 px-4 min-w-[220px] hidden md:table-cell">Program & Kegiatan Induk</th>
                <th className="py-3 px-3.5 min-w-[125px] text-right">Sebelum</th>
                <th className="py-3 px-3.5 min-w-[125px] text-right">Sesudah</th>
                <th className="py-3 px-3.5 min-w-[125px] text-right">Selisih</th>
                <th className="py-3 px-2 w-20 text-center">Aksi</th>
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
