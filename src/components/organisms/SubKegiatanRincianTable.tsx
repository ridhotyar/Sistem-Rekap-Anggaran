import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Layers,
  Lock,
  Unlock,
  Tag,
  Coins,
  ChevronDown,
  ChevronRight,
  Printer,
  Download,
  FolderTree,
  Building,
  Target,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { CurrencyText } from '../atoms/CurrencyText';
import { SearchBar } from '../molecules/SearchBar';
import { EmptyState } from '../molecules/EmptyState';
import { Pagination } from '../molecules/Pagination';
import { RincianBelanjaItem, GroupingMode } from '../../types/budget';
import { AppUser } from '../../types/auth';
import { SUBS_SUB_BL_NAMES } from '../../data/initialBudgetData';

export interface SubKegiatanRincianTableProps {
  items: RincianBelanjaItem[];
  keteranganTeks?: string;
  idKetSubBl?: number;
  onAddItem: () => void;
  onEditItem: (item: RincianBelanjaItem) => void;
  onDeleteItem: (item: RincianBelanjaItem) => void;
  currentUser?: AppUser | null;
  isAdmin?: boolean;
  onApproveProposal?: (item: RincianBelanjaItem) => void;
  onResetProposal?: (item: RincianBelanjaItem) => void;
}

export const SubKegiatanRincianTable: React.FC<SubKegiatanRincianTableProps> = ({
  items,
  keteranganTeks,
  idKetSubBl,
  onAddItem,
  onEditItem,
  onDeleteItem,
  currentUser,
  isAdmin = currentUser?.role === 'admin',
  onApproveProposal,
  onResetProposal,
}) => {
  const [search, setSearch] = useState('');
  const [selectedAkun, setSelectedAkun] = useState<string>('all');
  const [selectedSubs, setSelectedSubs] = useState<string>('all');
  const [selectedKet, setSelectedKet] = useState<string>('all');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('keterangan_paket');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Distinct accounts
  const distinctAccounts = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (item.kode_akun && item.nama_akun) {
        map.set(item.kode_akun, `${item.kode_akun} - ${item.nama_akun}`);
      }
    });
    return Array.from(map.entries()).map(([kode, label]) => ({ kode, label }));
  }, [items]);

  // Distinct subs_sub_bl (sub groups)
  const distinctSubs = useMemo(() => {
    const map = new Map<number, string>();
    items.forEach((item) => {
      if (item.id_subs_sub_bl) {
        const name = SUBS_SUB_BL_NAMES[item.id_subs_sub_bl] || `Subs ${item.id_subs_sub_bl}`;
        map.set(item.id_subs_sub_bl, `${item.id_subs_sub_bl} - ${name}`);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [items]);

  // Distinct Keterangan Sub BL (Paket Aktivitas)
  const distinctKeterangan = useMemo(() => {
    const map = new Map<number, string>();
    items.forEach((item) => {
      if (item.id_ket_sub_bl) {
        map.set(
          item.id_ket_sub_bl,
          `ID ${item.id_ket_sub_bl}: ${item.ket_bl_teks || 'Paket Keterangan Belanja'}`
        );
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const query = search.toLowerCase();
      const matchSearch =
        item.nama_akun?.toLowerCase().includes(query) ||
        item.kode_akun?.toLowerCase().includes(query) ||
        item.nama_standar_harga?.toLowerCase().includes(query) ||
        item.kode_standar_harga?.toLowerCase().includes(query) ||
        item.spek?.toLowerCase().includes(query) ||
        item.user_spek?.toLowerCase().includes(query) ||
        item.koefisien?.toLowerCase().includes(query) ||
        item.user_koefisien?.toLowerCase().includes(query) ||
        item.ket_bl_teks?.toLowerCase().includes(query);

      const matchAkun = selectedAkun === 'all' || item.kode_akun === selectedAkun;
      const matchSubs = selectedSubs === 'all' || String(item.id_subs_sub_bl) === selectedSubs;
      const matchKet = selectedKet === 'all' || String(item.id_ket_sub_bl) === selectedKet;

      return matchSearch && matchAkun && matchSubs && matchKet;
    });
  }, [items, search, selectedAkun, selectedSubs, selectedKet]);

  // Totals for comparison summary
  const { totalBase, totalUserProposal, selisihTotal, totalAdjustedCount, totalNewItemCount } = useMemo(() => {
    let baseSum = 0;
    let userSum = 0;
    let adjustedCount = 0;
    let newCount = 0;

    filteredItems.forEach((item) => {
      const base = item.is_user_added ? 0 : item.total_harga || 0;
      baseSum += base;

      const hasUserAdjustment = item.user_total_harga !== undefined || item.is_user_added;
      const userProposed = hasUserAdjustment ? item.user_total_harga || 0 : item.total_harga || 0;
      userSum += userProposed;

      if (item.is_user_added) {
        newCount += 1;
      } else if (item.user_total_harga !== undefined && item.user_total_harga !== item.total_harga) {
        adjustedCount += 1;
      }
    });

    return {
      totalBase: baseSum,
      totalUserProposal: userSum,
      selisihTotal: userSum - baseSum,
      totalAdjustedCount: adjustedCount,
      totalNewItemCount: newCount,
    };
  }, [filteredItems]);

  // Helper to toggle group collapse
  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Group by Keterangan -> Subs (hierarchical view)
  const groupedByKeterangan = useMemo(() => {
    const ketMap = new Map<
      number,
      {
        id_ket_sub_bl: number;
        ket_bl_teks: string;
        subsMap: Map<
          number,
          {
            id_subs_sub_bl: number;
            nama_subs: string;
            items: RincianBelanjaItem[];
            subtotalBase: number;
            subtotalUser: number;
          }
        >;
        totalPaguBase: number;
        totalPaguUser: number;
        itemCount: number;
      }
    >();

    filteredItems.forEach((item) => {
      const ketId = item.id_ket_sub_bl || 0;
      const subsId = item.id_subs_sub_bl || 0;

      if (!ketMap.has(ketId)) {
        ketMap.set(ketId, {
          id_ket_sub_bl: ketId,
          ket_bl_teks: item.ket_bl_teks || `Paket Keterangan Belanja #${ketId}`,
          subsMap: new Map(),
          totalPaguBase: 0,
          totalPaguUser: 0,
          itemCount: 0,
        });
      }

      const ket = ketMap.get(ketId)!;
      if (!ket.subsMap.has(subsId)) {
        ket.subsMap.set(subsId, {
          id_subs_sub_bl: subsId,
          nama_subs: item.nama_subs_sub_bl || SUBS_SUB_BL_NAMES[subsId] || `Subs #${subsId}`,
          items: [],
          subtotalBase: 0,
          subtotalUser: 0,
        });
      }

      const subs = ket.subsMap.get(subsId)!;
      subs.items.push(item);

      const basePrice = item.is_user_added ? 0 : item.total_harga || 0;
      const userPrice = item.user_total_harga !== undefined ? item.user_total_harga : item.total_harga || 0;

      subs.subtotalBase += basePrice;
      subs.subtotalUser += userPrice;

      ket.totalPaguBase += basePrice;
      ket.totalPaguUser += userPrice;
      ket.itemCount += 1;
    });

    return Array.from(ketMap.values()).map((k) => ({
      ...k,
      subsList: Array.from(k.subsMap.values()),
    }));
  }, [filteredItems]);

  // Paginated list for flat view
  const paginatedFlatItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Helper to render an item row with side-by-side comparison columns
  const renderItemRow = (item: RincianBelanjaItem, idx: number) => {
    const isUserAdded = Boolean(item.is_user_added);
    const hasAdjustment = item.user_total_harga !== undefined || isUserAdded;
    const baseTotal = isUserAdded ? 0 : item.total_harga || 0;
    const userTotal = hasAdjustment ? item.user_total_harga ?? baseTotal : baseTotal;
    const selisih = userTotal - baseTotal;

    const canDeleteThisItem = isAdmin || isUserAdded;

    return (
      <tr
        key={item.id || item.id_rinci_sub_bl}
        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
          isUserAdded
            ? 'bg-teal-50/30 dark:bg-teal-950/20'
            : hasAdjustment && selisih !== 0
            ? 'bg-amber-50/30 dark:bg-amber-950/20'
            : ''
        }`}
      >
        {/* No */}
        <td className="py-3 px-3 text-center text-slate-400 font-medium">
          {idx + 1}
        </td>

        {/* Rekening & SSH */}
        <td className="py-3 px-3">
          <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">
            {item.kode_akun}
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
            {item.nama_akun}
          </span>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-mono">
            <span>SSH: {item.kode_standar_harga}</span>
            <span>•</span>
            <span className="truncate max-w-[140px]">{item.nama_standar_harga}</span>
          </div>
        </td>

        {/* Uraian Spesifikasi */}
        <td className="py-3 px-3">
          <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
            {item.spek}
          </p>
          {item.user_spek && item.user_spek !== item.spek && (
            <div className="mt-1 p-1.5 rounded bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[10px] text-teal-800 dark:text-teal-300">
              <span className="font-bold">Usulan Spek User:</span> {item.user_spek}
            </div>
          )}
          {item.user_catatan && (
            <div className="mt-1 text-[10px] text-slate-500 italic">
              Alasan: {item.user_catatan}
            </div>
          )}
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
            ID Rinci: {item.id_rinci_sub_bl}
          </span>
        </td>

        {/* KOLOM 1: DATA DASAR BASE (ADMIN / JSON) */}
        <td className="py-3 px-3 bg-slate-50/60 dark:bg-slate-800/20 border-x border-slate-200/60 dark:border-slate-800">
          {isUserAdded ? (
            <div className="text-center">
              <Badge variant="neutral" size="xs">
                Item Baru User
              </Badge>
              <div className="text-[10px] text-slate-400 mt-0.5">Tidak ada di JSON Admin</div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <span className="text-slate-500">Koef:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.koefisien}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <span className="text-slate-500">Harga:</span>
                <CurrencyText amount={item.harga_satuan} className="text-slate-700 dark:text-slate-300" />
              </div>
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-bold text-xs">
                <span className="text-slate-600 dark:text-slate-400">Total:</span>
                <CurrencyText amount={item.total_harga} className="text-slate-900 dark:text-white" />
              </div>
            </div>
          )}
        </td>

        {/* KOLOM 2: DATA USULAN / PENYESUAIAN (USER BIASA) - NEW COLUMN! */}
        <td className="py-3 px-3 bg-teal-50/40 dark:bg-teal-950/20 border-r border-teal-200/50 dark:border-teal-900/50">
          {hasAdjustment ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <span className="text-teal-700 dark:text-teal-400">Koef Usulan:</span>
                <span className="font-bold text-teal-900 dark:text-teal-200">
                  {item.user_koefisien || item.koefisien}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <span className="text-teal-700 dark:text-teal-400">Harga Usulan:</span>
                <CurrencyText
                  amount={item.user_harga_satuan ?? item.harga_satuan}
                  className="font-bold text-teal-800 dark:text-teal-300"
                />
              </div>
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-teal-200/60 dark:border-teal-800/60 font-extrabold text-xs">
                <span className="text-teal-800 dark:text-teal-300">Total Usulan:</span>
                <CurrencyText
                  amount={item.user_total_harga ?? item.total_harga}
                  className="text-teal-900 dark:text-teal-100"
                />
              </div>
              <div className="text-[10px] text-teal-600 dark:text-teal-400 flex items-center gap-1 pt-0.5">
                <UserCheck className="w-3 h-3 shrink-0" />
                <span className="truncate">Oleh: {item.user_updated_by || 'User Biasa'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-slate-400 text-[11px] italic">
              Sesuai Data Base JSON
            </div>
          )}
        </td>

        {/* KOLOM 3: SELISIH PERBANDINGAN (+/-) - NEW COLUMN! */}
        <td className="py-3 px-3 text-right">
          {selisih > 0 ? (
            <div className="inline-flex flex-col items-end">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                +<CurrencyText amount={selisih} />
              </span>
              <Badge variant="success" size="xs" className="mt-0.5">
                {isUserAdded ? 'Item Baru' : 'Bertambah'}
              </Badge>
            </div>
          ) : selisih < 0 ? (
            <div className="inline-flex flex-col items-end">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-3.5 h-3.5" />
                <CurrencyText amount={selisih} />
              </span>
              <Badge variant="danger" size="xs" className="mt-0.5">
                Berkurang
              </Badge>
            </div>
          ) : (
            <div className="inline-flex flex-col items-end">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Minus className="w-3 h-3" /> Rp 0
              </span>
              <span className="text-[10px] text-slate-400">Tetap</span>
            </div>
          )}
        </td>

        {/* Aksi */}
        <td className="py-3 px-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {/* Edit / Sesuaikan Button */}
            <button
              onClick={() => onEditItem(item)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                !isAdmin
                  ? 'text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300'
                  : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              title={!isAdmin ? 'Sesuaikan / Berikan Usulan Perubahan' : 'Ubah Rincian Base (Admin)'}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* Delete Button: Admin can delete base JSON items. User can only delete user-added items! */}
            {canDeleteThisItem ? (
              <button
                onClick={() => onDeleteItem(item)}
                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                title={
                  isAdmin
                    ? 'Hapus Rincian Belanja (Khusus Admin)'
                    : 'Hapus Item Usulan Baru ini'
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span
                className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                title="Rincian dari JSON Admin hanya dapat dihapus oleh Admin"
              >
                <Lock className="w-3.5 h-3.5" />
              </span>
            )}

            {/* Admin Action: Approve proposal into base or reset proposal */}
            {isAdmin && hasAdjustment && !isUserAdded && (
              <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-slate-200 dark:border-slate-700">
                {onApproveProposal && (
                  <button
                    onClick={() => onApproveProposal(item)}
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    title="Setujui usulan staf ini menjadi data base"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                {onResetProposal && (
                  <button
                    onClick={() => onResetProposal(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                    title="Reset / Tolak penyesuaian staf kembali ke base"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <Card variant="default" padding="none" className="overflow-hidden space-y-0">
      {/* Executive Comparison Summary Card */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950 text-white border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider">
                Matriks Perbandingan Anggaran
              </span>
              <span className="text-xs text-slate-400">
                Data Base JSON Admin vs Usulan Staf
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1">
              Perbandingan Rincian Belanja Sub-Kegiatan
            </h3>
            <p className="text-xs text-slate-300/80">
              Menampilkan komparasi nilai dasar dari JSON SIPD dengan hasil ubah/usulan penyesuaian staf.
            </p>
          </div>

          {/* 3 Metric Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0 text-xs">
            {/* Base Admin */}
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">
                Total Base JSON Admin
              </span>
              <CurrencyText
                amount={totalBase}
                className="text-sm sm:text-base font-extrabold text-white font-mono mt-0.5"
              />
            </div>

            {/* Usulan User */}
            <div className="bg-teal-500/15 backdrop-blur-md p-3 rounded-xl border border-teal-400/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-teal-200 uppercase tracking-wider font-semibold">
                  Total Usulan User Staf
                </span>
                <span className="text-[10px] bg-teal-400/20 text-teal-200 px-1 rounded">
                  {totalAdjustedCount + totalNewItemCount} diubah
                </span>
              </div>
              <CurrencyText
                amount={totalUserProposal}
                className="text-sm sm:text-base font-extrabold text-teal-200 font-mono mt-0.5"
              />
            </div>

            {/* Selisih */}
            <div
              className={`p-3 rounded-xl border backdrop-blur-md ${
                selisihTotal > 0
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : selisihTotal < 0
                  ? 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                  : 'bg-white/10 border-white/10 text-white'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider block font-semibold">
                Selisih Komparasi (+/-)
              </span>
              <div className="text-sm sm:text-base font-extrabold font-mono mt-0.5 flex items-center gap-1">
                {selisihTotal > 0 ? '+' : ''}
                <CurrencyText amount={selisihTotal} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control bar: search, filters & add button */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari rekening akun, SSH, spesifikasi belanja, atau paket..."
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg bg-slate-200/80 dark:bg-slate-800 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setGroupingMode('keterangan_paket')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  groupingMode === 'keterangan_paket'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Hierarki Paket Belanja
              </button>
              <button
                type="button"
                onClick={() => setGroupingMode('flat')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  groupingMode === 'flat'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Tabel Lengkap (Semua Item)
              </button>
            </div>

            {/* Add Item Button: Admin creates Base; User creates Usulan */}
            <Button
              variant="primary"
              size="sm"
              onClick={onAddItem}
              icon={<Plus className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
            >
              {!isAdmin ? 'Tambah Usulan Belanja' : 'Tambah Rincian Base'}
            </Button>
          </div>
        </div>

        {/* Filter select rows */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          {distinctKeterangan.length > 1 && (
            <select
              value={selectedKet}
              onChange={(e) => setSelectedKet(e.target.value)}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="all">Semua Paket Keterangan ({distinctKeterangan.length})</option>
              {distinctKeterangan.map((k) => (
                <option key={k.id} value={String(k.id)}>
                  {k.label}
                </option>
              ))}
            </select>
          )}

          {distinctAccounts.length > 1 && (
            <select
              value={selectedAkun}
              onChange={(e) => setSelectedAkun(e.target.value)}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs max-w-xs truncate"
            >
              <option value="all">Semua Rekening Belanja ({distinctAccounts.length})</option>
              {distinctAccounts.map((a) => (
                <option key={a.kode} value={a.kode}>
                  {a.label}
                </option>
              ))}
            </select>
          )}

          {(search || selectedAkun !== 'all' || selectedKet !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedAkun('all');
                setSelectedKet('all');
              }}
              className="text-xs text-rose-600 hover:underline font-semibold ml-2 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      {filteredItems.length === 0 ? (
        <div className="p-8">
          <EmptyState
            title="Tidak ada rincian belanja"
            description="Tidak ditemukan rincian belanja yang cocok dengan kriteria filter Anda."
            actionLabel="Tambah Rincian Baru"
            onAction={onAddItem}
          />
        </div>
      ) : groupingMode === 'keterangan_paket' ? (
        /* Hierarchical Grouping View */
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {groupedByKeterangan.map((ketGroup) => {
            const isKetCollapsed = !!collapsedGroups[`ket-${ketGroup.id_ket_sub_bl}`];

            return (
              <div key={ketGroup.id_ket_sub_bl} className="bg-white dark:bg-slate-900">
                {/* Header Paket Aktivitas */}
                <div
                  onClick={() => toggleGroup(`ket-${ketGroup.id_ket_sub_bl}`)}
                  className="p-3.5 sm:p-4 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer select-none transition-colors border-y border-slate-200/80 dark:border-slate-700/80"
                >
                  <div className="flex items-center gap-2.5">
                    <button className="text-slate-500 hover:text-slate-700">
                      {isKetCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          ID: {ketGroup.id_ket_sub_bl}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {ketGroup.ket_bl_teks}
                        </h4>
                        <Badge variant="primary" size="xs">
                          {ketGroup.itemCount} Item
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                        Pagu Base:
                      </span>
                      <CurrencyText
                        amount={ketGroup.totalPaguBase}
                        className="font-bold text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div className="text-right pl-3 border-l border-slate-300 dark:border-slate-700">
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-wider block font-bold">
                        Pagu Usulan:
                      </span>
                      <CurrencyText
                        amount={ketGroup.totalPaguUser}
                        className="font-extrabold text-teal-800 dark:text-teal-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Body of Subs */}
                {!isKetCollapsed && (
                  <div className="p-3 sm:p-4 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
                    {ketGroup.subsList.map((subs) => {
                      const isSubsCollapsed = !!collapsedGroups[`subs-${subs.id_subs_sub_bl}`];

                      return (
                        <div
                          key={subs.id_subs_sub_bl}
                          className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs"
                        >
                          {/* Subs Header */}
                          <div
                            onClick={() => toggleGroup(`subs-${subs.id_subs_sub_bl}`)}
                            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between cursor-pointer border-b border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <button className="text-slate-400">
                                {isSubsCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-200 dark:bg-slate-700 px-1 rounded">
                                Subs #{subs.id_subs_sub_bl}
                              </span>
                              <span className="text-slate-800 dark:text-slate-200">
                                {subs.nama_subs}
                              </span>
                              <Badge variant="neutral" size="xs">
                                {subs.items.length} item
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-500">
                                Base: <CurrencyText amount={subs.subtotalBase} className="font-bold text-slate-800 dark:text-slate-200" />
                              </span>
                              <span>•</span>
                              <span className="text-teal-700 dark:text-teal-300 font-bold">
                                Usulan: <CurrencyText amount={subs.subtotalUser} />
                              </span>
                            </div>
                          </div>

                          {/* Table of items */}
                          {!isSubsCollapsed && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                                    <th className="py-2.5 px-3 min-w-[200px]">Rekening Belanja & SSH</th>
                                    <th className="py-2.5 px-3 min-w-[200px]">Spesifikasi / Barang</th>
                                    <th className="py-2.5 px-3 min-w-[170px] bg-slate-200/50 dark:bg-slate-800/80 text-slate-800 dark:text-white font-bold border-x border-slate-200 dark:border-slate-700">
                                      Data Base (Admin JSON)
                                    </th>
                                    <th className="py-2.5 px-3 min-w-[180px] bg-teal-100/70 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold border-r border-teal-200 dark:border-teal-900">
                                      Usulan Penyesuaian (User Staf)
                                    </th>
                                    <th className="py-2.5 px-3 min-w-[110px] text-right">Selisih (+/-)</th>
                                    <th className="py-2.5 px-3 w-24 text-center">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                  {subs.items.map((item, idx) => renderItemRow(item, idx))}
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
        /* Flat View with Comparison Columns */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 min-w-[200px]">Rekening Belanja & SSH</th>
                <th className="py-3 px-3 min-w-[200px]">Spesifikasi / Barang</th>
                <th className="py-3 px-3 min-w-[170px] bg-slate-200/50 dark:bg-slate-800/80 text-slate-800 dark:text-white font-bold border-x border-slate-200 dark:border-slate-700">
                  Data Base (Admin JSON)
                </th>
                <th className="py-3 px-3 min-w-[180px] bg-teal-100/70 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold border-r border-teal-200 dark:border-teal-900">
                  Usulan Penyesuaian (User Staf)
                </th>
                <th className="py-3 px-3 min-w-[110px] text-right">Selisih (+/-)</th>
                <th className="py-3 px-3 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {paginatedFlatItems.map((item, idx) =>
                renderItemRow(item, (currentPage - 1) * itemsPerPage + idx)
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredItems.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
