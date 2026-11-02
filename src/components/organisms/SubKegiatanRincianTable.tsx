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
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { CurrencyText } from '../atoms/CurrencyText';
import { SearchBar } from '../molecules/SearchBar';
import { EmptyState } from '../molecules/EmptyState';
import { Pagination } from '../molecules/Pagination';
import { RincianBelanjaItem, GroupingMode } from '../../types/budget';
import { SUBS_SUB_BL_NAMES } from '../../data/initialBudgetData';

export interface SubKegiatanRincianTableProps {
  items: RincianBelanjaItem[];
  keteranganTeks?: string;
  idKetSubBl?: number;
  onAddItem: () => void;
  onEditItem: (item: RincianBelanjaItem) => void;
  onDeleteItem: (item: RincianBelanjaItem) => void;
}

export const SubKegiatanRincianTable: React.FC<SubKegiatanRincianTableProps> = ({
  items,
  keteranganTeks,
  idKetSubBl,
  onAddItem,
  onEditItem,
  onDeleteItem,
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
        item.koefisien?.toLowerCase().includes(query) ||
        item.ket_bl_teks?.toLowerCase().includes(query);

      const matchAkun = selectedAkun === 'all' || item.kode_akun === selectedAkun;
      const matchSubs = selectedSubs === 'all' || String(item.id_subs_sub_bl) === selectedSubs;
      const matchKet = selectedKet === 'all' || String(item.id_ket_sub_bl) === selectedKet;

      return matchSearch && matchAkun && matchSubs && matchKet;
    });
  }, [items, search, selectedAkun, selectedSubs, selectedKet]);

  // Grand total
  const filteredGrandTotal = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
  }, [filteredItems]);

  // Grouped by Keterangan & Subs Sub BL (SIPD Official Hierarchy)
  const groupedByKeterangan = useMemo(() => {
    const ketGroups: Record<
      string,
      {
        id_ket_sub_bl: number;
        ket_bl_teks: string;
        subtotal: number;
        subsList: {
          id_subs_sub_bl: number;
          nama_subs: string;
          subtotal: number;
          items: RincianBelanjaItem[];
        }[];
      }
    > = {};

    filteredItems.forEach((item) => {
      const ketKey = String(item.id_ket_sub_bl || idKetSubBl || 957927);
      const ketTitle = item.ket_bl_teks || keteranganTeks || 'Rincian Belanja Sub-Kegiatan';

      if (!ketGroups[ketKey]) {
        ketGroups[ketKey] = {
          id_ket_sub_bl: Number(ketKey),
          ket_bl_teks: ketTitle,
          subtotal: 0,
          subsList: [],
        };
      }
      ketGroups[ketKey].subtotal += item.total_harga || 0;

      // Find or create subs sub group
      let subEntry = ketGroups[ketKey].subsList.find(
        (s) => s.id_subs_sub_bl === item.id_subs_sub_bl
      );
      if (!subEntry) {
        subEntry = {
          id_subs_sub_bl: item.id_subs_sub_bl,
          nama_subs: SUBS_SUB_BL_NAMES[item.id_subs_sub_bl] || `Kelompok Sub Belanja (${item.id_subs_sub_bl})`,
          subtotal: 0,
          items: [],
        };
        ketGroups[ketKey].subsList.push(subEntry);
      }
      subEntry.subtotal += item.total_harga || 0;
      subEntry.items.push(item);
    });

    return Object.values(ketGroups);
  }, [filteredItems, idKetSubBl, keteranganTeks]);

  // Grouped by Account
  const groupedByAccount = useMemo(() => {
    const groups: Record<
      string,
      {
        kode_akun: string;
        nama_akun: string;
        subtotal: number;
        items: RincianBelanjaItem[];
      }
    > = {};

    filteredItems.forEach((item) => {
      const key = item.kode_akun || 'Lainnya';
      if (!groups[key]) {
        groups[key] = {
          kode_akun: item.kode_akun,
          nama_akun: item.nama_akun,
          subtotal: 0,
          items: [],
        };
      }
      groups[key].items.push(item);
      groups[key].subtotal += item.total_harga || 0;
    });

    return Object.values(groups);
  }, [filteredItems]);

  // Pagination for flat view
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedFlatItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'ID Rinci',
      'ID Keterangan',
      'Keterangan Belanja (Paket)',
      'ID Subs Sub BL',
      'Kelompok Sub Belanja',
      'Kode Rekening',
      'Nama Rekening',
      'Kode Standar Harga',
      'Nama Standar Harga',
      'Spesifikasi',
      'Koefisien',
      'Harga Satuan',
      'Total Harga',
      'SSH Locked',
    ];

    const rows = filteredItems.map((i) => [
      i.id_rinci_sub_bl,
      i.id_ket_sub_bl,
      `"${(i.ket_bl_teks || keteranganTeks || '').replace(/"/g, '""')}"`,
      i.id_subs_sub_bl,
      `"${(SUBS_SUB_BL_NAMES[i.id_subs_sub_bl] || '').replace(/"/g, '""')}"`,
      `"${i.kode_akun}"`,
      `"${i.nama_akun}"`,
      `"${i.kode_standar_harga}"`,
      `"${i.nama_standar_harga}"`,
      `"${i.spek.replace(/"/g, '""')}"`,
      `"${i.koefisien}"`,
      i.harga_satuan,
      i.total_harga,
      i.ssh_locked ?? '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rincian_belanja_sipd_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      {/* Top Filter & Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Rincian Belanja Sub-Kegiatan (SIPD)
              </h2>
              <Badge variant="primary" size="xs">
                {items.length} Rincian Item
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabel itemized pengelompokan Keterangan Belanja, Rekening Akun, Spesifikasi, Koefisien, dan SSH.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setGroupingMode('keterangan_paket')}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${
                  groupingMode === 'keterangan_paket'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
                title="Grup berdasarkan Keterangan Sub Belanja & Paket"
              >
                Grup Keterangan & Paket
              </button>
              <button
                type="button"
                onClick={() => setGroupingMode('akun')}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${
                  groupingMode === 'akun'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
                title="Grup berdasarkan Kode Rekening Belanja"
              >
                Grup Rekening
              </button>
              <button
                type="button"
                onClick={() => setGroupingMode('flat')}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${
                  groupingMode === 'flat'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
                title="Tampilan Daftar Penuh"
              >
                Daftar Lengkap
              </button>
            </div>

            {/* Print & CSV buttons */}
            <Button
              variant="outline"
              size="xs"
              onClick={handlePrint}
              icon={<Printer className="w-3.5 h-3.5 text-slate-500" />}
              className="border-slate-300"
            >
              Cetak
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={handleExportCSV}
              icon={<Download className="w-3.5 h-3.5 text-slate-500" />}
              className="border-slate-300"
            >
              CSV
            </Button>

            {/* Add New Item */}
            <Button
              variant="primary"
              size="xs"
              onClick={onAddItem}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Tambah Rincian
            </Button>
          </div>
        </div>

        {/* Search & Keterangan & Account & Subs Dropdown Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className={`${distinctKeterangan.length > 1 ? 'lg:col-span-2' : 'md:col-span-2 lg:col-span-2'}`}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari uraian barang, spesifikasi, kode SSH, atau nama akun..."
            />
          </div>

          {distinctKeterangan.length > 1 && (
            <div>
              <select
                value={selectedKet}
                onChange={(e) => setSelectedKet(e.target.value)}
                className="w-full text-xs border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/40 rounded-lg px-2.5 py-2 text-emerald-900 dark:text-emerald-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Paket Keterangan ({distinctKeterangan.length})</option>
                {distinctKeterangan.map((k) => (
                  <option key={k.id} value={String(k.id)}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <select
              value={selectedAkun}
              onChange={(e) => setSelectedAkun(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Semua Rekening ({distinctAccounts.length})</option>
              {distinctAccounts.map((acc) => (
                <option key={acc.kode} value={acc.kode}>
                  {acc.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSubs}
              onChange={(e) => setSelectedSubs(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Semua Kelompok Paket ({distinctSubs.length})</option>
              {distinctSubs.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Display */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="Tidak ada rincian belanja yang cocok"
          description="Coba ubah kata kunci pencarian atau sesuaikan filter rekening dan paket."
          actionLabel="Tampilkan Semua Data"
          onAction={() => {
            setSearch('');
            setSelectedAkun('all');
            setSelectedSubs('all');
          }}
        />
      ) : groupingMode === 'keterangan_paket' ? (
        /* Grouped By Keterangan & Subs Sub BL (SIPD Hierarchy) */
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {groupedByKeterangan.map((ket) => {
            const ketCollapseKey = `ket-${ket.id_ket_sub_bl}`;
            const isKetCollapsed = !!collapsedGroups[ketCollapseKey];

            return (
              <div key={ket.id_ket_sub_bl} className="bg-white dark:bg-slate-900">
                {/* Level 1: Keterangan Sub Belanja Banner */}
                <div
                  onClick={() => toggleGroup(ketCollapseKey)}
                  className="px-4 py-3.5 bg-gradient-to-r from-emerald-900/10 via-teal-900/5 to-transparent hover:bg-emerald-50/60 dark:hover:bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none transition-colors border-y border-emerald-200/60 dark:border-slate-800"
                >
                  <div className="flex items-start gap-2.5">
                    <button className="text-emerald-700 dark:text-emerald-400 mt-0.5 hover:scale-110 transition-transform">
                      {isKetCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-700 text-white">
                          Keterangan Belanja
                        </span>
                        <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300 font-semibold">
                          ID Ket: {ket.id_ket_sub_bl}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
                        {ket.ket_bl_teks}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className="text-xs text-slate-500">Subtotal Keterangan:</span>
                    <CurrencyText
                      amount={ket.subtotal}
                      className="text-sm sm:text-base font-extrabold text-emerald-800 dark:text-emerald-300"
                    />
                  </div>
                </div>

                {/* Level 2: Subs Sub BL Clusters */}
                {!isKetCollapsed && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ket.subsList.map((subs) => {
                      const subsCollapseKey = `subs-${subs.id_subs_sub_bl}`;
                      const isSubsCollapsed = !!collapsedGroups[subsCollapseKey];

                      return (
                        <div key={subs.id_subs_sub_bl} className="bg-slate-50/30 dark:bg-slate-900/50">
                          {/* Subs Header */}
                          <div
                            onClick={() => toggleGroup(subsCollapseKey)}
                            className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer select-none transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <button className="text-slate-400">
                                {isSubsCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                Subs #{subs.id_subs_sub_bl}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {subs.nama_subs}
                              </span>
                              <Badge variant="neutral" size="xs">
                                {subs.items.length} item
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">Subtotal:</span>
                              <CurrencyText
                                amount={subs.subtotal}
                                className="font-bold text-slate-800 dark:text-slate-200"
                              />
                            </div>
                          </div>

                          {/* Table of Items */}
                          {!isSubsCollapsed && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                                    <th className="py-2.5 px-4 min-w-[200px]">Rekening Belanja</th>
                                    <th className="py-2.5 px-4 min-w-[200px]">Kode & Nama SSH</th>
                                    <th className="py-2.5 px-4 min-w-[220px]">Spesifikasi</th>
                                    <th className="py-2.5 px-4 min-w-[110px] text-center">Koefisien</th>
                                    <th className="py-2.5 px-4 min-w-[110px] text-right">Harga Satuan</th>
                                    <th className="py-2.5 px-4 min-w-[130px] text-right">Total Belanja</th>
                                    <th className="py-2.5 px-4 w-24 text-center">Status SSH</th>
                                    <th className="py-2.5 px-4 w-20 text-center">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                  {subs.items.map((item, idx) => (
                                    <tr
                                      key={item.id || item.id_rinci_sub_bl}
                                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                      <td className="py-3 px-4 text-center text-slate-400 font-medium">
                                        {idx + 1}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                                          {item.kode_akun}
                                        </span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                                          {item.nama_akun}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="font-mono text-[10px] text-slate-500 block">
                                          {item.kode_standar_harga}
                                        </span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                          {item.nama_standar_harga}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4">
                                        <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                          {item.spek}
                                        </p>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          ID Rinci: {item.id_rinci_sub_bl}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200/60 dark:border-slate-700">
                                          {item.koefisien}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <CurrencyText
                                          amount={item.harga_satuan}
                                          className="text-slate-600 dark:text-slate-300"
                                        />
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <CurrencyText
                                          amount={item.total_harga}
                                          className="text-slate-900 dark:text-white font-bold"
                                        />
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        {item.ssh_locked === '1' ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                            <Lock className="w-2.5 h-2.5" /> SSH Kunci
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                            <Unlock className="w-2.5 h-2.5" /> Terbuka
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            onClick={() => onEditItem(item)}
                                            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                            title="Edit Rincian"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => onDeleteItem(item)}
                                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                            title="Hapus Rincian"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
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
      ) : groupingMode === 'akun' ? (
        /* Grouped By Account View */
        <div className="overflow-x-auto divide-y divide-slate-200 dark:divide-slate-800">
          {groupedByAccount.map((group) => {
            const isCollapsed = !!collapsedGroups[group.kode_akun];

            return (
              <div key={group.kode_akun} className="bg-white dark:bg-slate-900">
                {/* Account Group Header */}
                <div
                  onClick={() => toggleGroup(group.kode_akun)}
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer select-none transition-colors border-y border-slate-200/80 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <button className="text-slate-400 hover:text-slate-600">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {group.kode_akun}
                    </span>
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      {group.nama_akun}
                    </span>
                    <Badge variant="neutral" size="xs">
                      {group.items.length} item
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      Subtotal:
                    </span>
                    <CurrencyText
                      amount={group.subtotal}
                      className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Account Group Rows */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2.5 px-4 w-12 text-center">No</th>
                          <th className="py-2.5 px-4 min-w-[140px]">Kelompok Subs</th>
                          <th className="py-2.5 px-4 min-w-[200px]">Kode & Nama SSH</th>
                          <th className="py-2.5 px-4 min-w-[240px]">Uraian Spesifikasi Teknis</th>
                          <th className="py-2.5 px-4 min-w-[120px] text-center">Koefisien</th>
                          <th className="py-2.5 px-4 min-w-[120px] text-right">Harga Satuan</th>
                          <th className="py-2.5 px-4 min-w-[140px] text-right">Total Belanja</th>
                          <th className="py-2.5 px-4 w-24 text-center">Status</th>
                          <th className="py-2.5 px-4 w-20 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {group.items.map((item, idx) => (
                          <tr
                            key={item.id || item.id_rinci_sub_bl}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-3 px-4 text-center text-slate-400 font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[10px] text-slate-500 block">
                                #{item.id_subs_sub_bl}
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {SUBS_SUB_BL_NAMES[item.id_subs_sub_bl] || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[10px] text-slate-500 block">
                                {item.kode_standar_harga}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.nama_standar_harga}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                {item.spek}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID Rinci: {item.id_rinci_sub_bl}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200/60 dark:border-slate-700">
                                {item.koefisien}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <CurrencyText
                                amount={item.harga_satuan}
                                className="text-slate-600 dark:text-slate-300"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <CurrencyText
                                amount={item.total_harga}
                                className="text-slate-900 dark:text-white font-bold"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.ssh_locked === '1' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <Lock className="w-2.5 h-2.5" /> SSH Kunci
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Unlock className="w-2.5 h-2.5" /> Terbuka
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => onEditItem(item)}
                                  className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Edit Rincian"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteItem(item)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Hapus Rincian"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 min-w-[150px]">Keterangan Belanja</th>
                <th className="py-3 px-4 min-w-[170px]">Rekening Belanja</th>
                <th className="py-3 px-4 min-w-[170px]">Standar Satuan Harga</th>
                <th className="py-3 px-4 min-w-[200px]">Spesifikasi</th>
                <th className="py-3 px-4 min-w-[100px] text-center">Koefisien</th>
                <th className="py-3 px-4 min-w-[110px] text-right">Harga Satuan</th>
                <th className="py-3 px-4 min-w-[120px] text-right">Total Belanja</th>
                <th className="py-3 px-4 w-24 text-center">Status</th>
                <th className="py-3 px-4 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {paginatedFlatItems.map((item, idx) => (
                <tr
                  key={item.id || item.id_rinci_sub_bl}
                  className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 text-center text-slate-400 font-medium">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 block">
                      ID: {item.id_ket_sub_bl}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                      {item.ket_bl_teks || keteranganTeks || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                      {item.kode_akun}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                      {item.nama_akun}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[10px] text-slate-500 block">
                      {item.kode_standar_harga}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.nama_standar_harga}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {item.spek}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID Rinci: {item.id_rinci_sub_bl}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200/60 dark:border-slate-700">
                      {item.koefisien}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <CurrencyText
                      amount={item.harga_satuan}
                      className="text-slate-600 dark:text-slate-300"
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <CurrencyText
                      amount={item.total_harga}
                      className="text-slate-900 dark:text-white font-bold"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.ssh_locked === '1' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Lock className="w-2.5 h-2.5" /> Kunci
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Unlock className="w-2.5 h-2.5" /> Terbuka
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditItem(item)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit Rincian"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Hapus Rincian"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination (Flat View only) */}
      {groupingMode === 'flat' && filteredItems.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Grand Total Footer */}
      <div className="p-4 sm:p-5 bg-emerald-50/70 dark:bg-emerald-950/40 border-t border-emerald-200/80 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <span className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            TOTAL KESELURUHAN RINCIAN BELANJA:
          </span>
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            ({filteredItems.length} item rincian)
          </span>
        </div>

        <div className="text-lg sm:text-2xl font-extrabold text-emerald-900 dark:text-emerald-100">
          <CurrencyText amount={filteredGrandTotal} />
        </div>
      </div>
    </Card>
  );
};
