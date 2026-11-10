import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Search,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  HelpCircle,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { CurrencyText } from '../atoms/CurrencyText';
import { StandarHargaItem, StandarHargaCategory } from '../../types/budget';
import {
  parseExcelFile,
  exportStandarHargaToExcel,
  downloadStandarHargaTemplate,
  resetStandarHargaToDefault,
  saveStoredStandarHarga,
  mergeStandarHargaLists,
} from '../../services/standarHargaService';

export interface StandarHargaModalProps {
  isOpen: boolean;
  onClose: () => void;
  standarHargaList: StandarHargaItem[];
  onUpdateStandarHargaList: (newList: StandarHargaItem[]) => void;
}

const CATEGORY_CONFIG: Record<
  StandarHargaCategory,
  {
    label: string;
    fullName: string;
    description: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    colorHex: string;
  }
> = {
  SSH: {
    label: 'SSH',
    fullName: 'Standar Satuan Harga',
    description: 'Harga satuan barang/jasa kebutuhan operasional kantor, ATK, bahan cetak, BBM, dsb.',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    colorHex: '#059669',
  },
  HSPK: {
    label: 'HSPK',
    fullName: 'Harga Satuan Pokok Kegiatan',
    description: 'Standar harga satuan pekerjaan konstruksi fisik, pemeliharaan gedung, jalan, dan instalasi.',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/80',
    badgeText: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    colorHex: '#2563eb',
  },
  ASB: {
    label: 'ASB',
    fullName: 'Analisis Standar Belanja',
    description: 'Standar biaya paket kegiatan terstruktur non-fisik (rapat koordinasi, bimtek, sosialisasi, monev).',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/80',
    badgeText: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    colorHex: '#9333ea',
  },
  SBU: {
    label: 'SBU',
    fullName: 'Standar Biaya Umum',
    description: 'Batas tertinggi honorarium narasumber/moderator/panitia, uang harian perjalanan dinas, dan konsumsi rapat.',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    colorHex: '#d97706',
  },
};

export const StandarHargaModal: React.FC<StandarHargaModalProps> = ({
  isOpen,
  onClose,
  standarHargaList,
  onUpdateStandarHargaList,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<StandarHargaCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importTargetCategory, setImportTargetCategory] = useState<StandarHargaCategory | 'AUTO'>('AUTO');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [parsedPreviewItems, setParsedPreviewItems] = useState<StandarHargaItem[] | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Manual Add / Edit State
  const [editingItem, setEditingItem] = useState<StandarHargaItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<StandarHargaCategory>('SSH');
  const [formKode, setFormKode] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formSpek, setFormSpek] = useState('');
  const [formSatuan, setFormSatuan] = useState('Paket');
  const [formHarga, setFormHarga] = useState<number>(50000);
  const [formKodeAkun, setFormKodeAkun] = useState('');
  const [formNamaAkun, setFormNamaAkun] = useState('');
  const [formKelompok, setFormKelompok] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<StandarHargaCategory | 'ALL', number> = {
      ALL: standarHargaList.length,
      SSH: 0,
      HSPK: 0,
      ASB: 0,
      SBU: 0,
    };
    standarHargaList.forEach((it) => {
      if (counts[it.kategori] !== undefined) {
        counts[it.kategori] += 1;
      }
    });
    return counts;
  }, [standarHargaList]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return standarHargaList.filter((it) => {
      const matchCat = selectedCategory === 'ALL' || it.kategori === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        it.nama_standar_harga.toLowerCase().includes(q) ||
        it.spek.toLowerCase().includes(q) ||
        it.kode_standar_harga.toLowerCase().includes(q) ||
        (it.satuan && it.satuan.toLowerCase().includes(q)) ||
        (it.kode_akun && it.kode_akun.toLowerCase().includes(q)) ||
        (it.nama_akun && it.nama_akun.toLowerCase().includes(q)) ||
        (it.kelompok_standar_harga && it.kelompok_standar_harga.toLowerCase().includes(q))
      );
    });
  }, [standarHargaList, selectedCategory, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  // Handle Excel File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportErrorMessage(null);
    setImportSuccessMessage(null);

    const targetCat = importTargetCategory === 'AUTO' ? undefined : importTargetCategory;
    const result = await parseExcelFile(file, targetCat);

    if (result.success && result.importedItems.length > 0) {
      setParsedPreviewItems(result.importedItems);
    } else {
      setParsedPreviewItems(null);
      setImportErrorMessage(
        result.errors[0] || 'Tidak ada baris data standar harga yang valid ditemukan pada file Excel.'
      );
    }
  };

  // Confirm Excel Import
  const handleConfirmImport = () => {
    if (!parsedPreviewItems || parsedPreviewItems.length === 0) return;

    const updatedList = mergeStandarHargaLists(
      standarHargaList,
      parsedPreviewItems,
      importTargetCategory,
      importMode
    );

    saveStoredStandarHarga(updatedList);
    onUpdateStandarHargaList(updatedList);
    setImportSuccessMessage(
      `Berhasil mengimpor ${parsedPreviewItems.length} item standar harga. Total database sekarang: ${updatedList.length} item.`
    );
    setParsedPreviewItems(null);
    setTimeout(() => {
      setIsImporting(false);
      setImportSuccessMessage(null);
    }, 1500);
  };

  // Open Form Add
  const handleOpenAdd = () => {
    setEditingItem(null);
    const cat = selectedCategory === 'ALL' ? 'SSH' : selectedCategory;
    setFormCategory(cat);
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setFormKode(`${cat}.${new Date().getFullYear()}.${randomCode}`);
    setFormNama('');
    setFormSpek('');
    setFormSatuan('Paket');
    setFormHarga(50000);
    setFormKodeAkun('5.1.02.01.001.00024');
    setFormNamaAkun('Belanja Alat/Bahan untuk Kegiatan Kantor');
    setFormKelompok('');
    setIsFormOpen(true);
  };

  // Open Form Edit
  const handleOpenEdit = (item: StandarHargaItem) => {
    setEditingItem(item);
    setFormCategory(item.kategori);
    setFormKode(item.kode_standar_harga);
    setFormNama(item.nama_standar_harga);
    setFormSpek(item.spek);
    setFormSatuan(item.satuan);
    setFormHarga(item.harga_satuan);
    setFormKodeAkun(item.kode_akun || '');
    setFormNamaAkun(item.nama_akun || '');
    setFormKelompok(item.kelompok_standar_harga || '');
    setIsFormOpen(true);
  };

  // Save Add/Edit
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formKode.trim()) {
      alert('Mohon isi nama dan kode standar harga!');
      return;
    }

    let updatedList: StandarHargaItem[];
    if (editingItem) {
      updatedList = standarHargaList.map((it) => {
        if (it.id === editingItem.id) {
          return {
            ...it,
            kategori: formCategory,
            kode_standar_harga: formKode.trim(),
            nama_standar_harga: formNama.trim(),
            spek: formSpek.trim() || formNama.trim(),
            satuan: formSatuan.trim() || 'Paket',
            harga_satuan: Number(formHarga) || 0,
            kode_akun: formKodeAkun.trim() || undefined,
            nama_akun: formNamaAkun.trim() || undefined,
            kelompok_standar_harga: formKelompok.trim() || undefined,
            updated_at: new Date().toISOString(),
          };
        }
        return it;
      });
    } else {
      const newItem: StandarHargaItem = {
        id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        id_standar_harga: Math.floor(4000000 + Math.random() * 900000),
        kategori: formCategory,
        kode_standar_harga: formKode.trim(),
        nama_standar_harga: formNama.trim(),
        spek: formSpek.trim() || formNama.trim(),
        satuan: formSatuan.trim() || 'Paket',
        harga_satuan: Number(formHarga) || 0,
        kode_akun: formKodeAkun.trim() || undefined,
        nama_akun: formNamaAkun.trim() || undefined,
        kelompok_standar_harga: formKelompok.trim() || undefined,
        tipe_dokumen: 'Input Manual Admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updatedList = [newItem, ...standarHargaList];
    }

    saveStoredStandarHarga(updatedList);
    onUpdateStandarHargaList(updatedList);
    setIsFormOpen(false);
  };

  // Delete item
  const handleDeleteItem = (item: StandarHargaItem) => {
    if (window.confirm(`Hapus standar harga "${item.nama_standar_harga}" (${item.kode_standar_harga})?`)) {
      const updatedList = standarHargaList.filter((it) => it.id !== item.id);
      saveStoredStandarHarga(updatedList);
      onUpdateStandarHargaList(updatedList);
    }
  };

  // Reset to default seed
  const handleResetDefault = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin mereset seluruh database Standar Satuan Harga kembali ke data resmi bawaan SIPD NTB 2027?'
      )
    ) {
      const defaultList = resetStandarHargaToDefault();
      onUpdateStandarHargaList(defaultList);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white dark:from-slate-850 dark:via-slate-850 dark:to-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-500 text-white shadow-sm shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Menu Standar Harga Satuan
                </h2>
                <Badge variant="primary" size="xs">
                  {standarHargaList.length} Item Terdaftar
                </Badge>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  TA 2027
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Database referensi satuan harga resmi: <strong>SSH</strong>, <strong>HSPK</strong>, <strong>ASB</strong>, dan <strong>SBU</strong> (Import Excel, kelola database & integrasi rincian belanja)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Category Filter Tabs & Toolbar */}
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 space-y-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('ALL');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Kategori</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedCategory === 'ALL'
                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900 font-extrabold'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600'
                }`}
              >
                {categoryCounts.ALL}
              </span>
            </button>

            {(['SSH', 'HSPK', 'ASB', 'SBU'] as StandarHargaCategory[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
                    isSelected
                      ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.border} ring-2 ring-emerald-500/30 shadow-xs font-black`
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                  title={`${cfg.fullName}: ${cfg.description}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cfg.colorHex }}
                  />
                  <span>{cat}</span>
                  <span className="font-normal text-[11px] hidden md:inline">
                    ({cfg.fullName})
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-black/10 dark:bg-white/20'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {categoryCounts[cat]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama barang, spesifikasi, kode SSH, atau rekening..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Import Excel */}
              <Button
                variant="primary"
                size="xs"
                onClick={() => setIsImporting(true)}
                icon={<Upload className="w-3.5 h-3.5 text-white" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                title="Import file Excel (.xlsx / .xls) untuk memperbarui database"
              >
                Import Excel
              </Button>

              {/* Download Template Excel */}
              <Button
                variant="outline"
                size="xs"
                onClick={downloadStandarHargaTemplate}
                icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                title="Unduh format template Excel resmi untuk pengisian data standar harga"
              >
                Template Excel
              </Button>

              {/* Export to Excel */}
              <Button
                variant="outline"
                size="xs"
                onClick={() => exportStandarHargaToExcel(filteredItems)}
                icon={<Download className="w-3.5 h-3.5 text-slate-600" />}
                title="Download data standar harga yang tampil ke file Excel"
              >
                Export Excel
              </Button>

              {/* Add Manual */}
              <Button
                variant="outline"
                size="xs"
                onClick={handleOpenAdd}
                icon={<Plus className="w-3.5 h-3.5 text-slate-600" />}
                title="Tambah item standar harga baru secara manual"
              >
                Tambah Item
              </Button>

              {/* Reset to Default */}
              <button
                type="button"
                onClick={handleResetDefault}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Reset database ke data bawaan resmi SIPD NTB"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Table / Empty State */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                Tidak ada standar harga yang cocok
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Coba sesuaikan kata kunci pencarian, ubah filter kategori, atau impor data baru melalui file Excel.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="xs" onClick={() => setSearchQuery('')}>
                  Reset Pencarian
                </Button>
                <Button variant="primary" size="xs" onClick={() => setIsImporting(true)}>
                  Import File Excel
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5 w-12 text-center">No</th>
                    <th className="py-3 px-3 w-24 text-center">Kategori</th>
                    <th className="py-3 px-3.5 min-w-[150px]">Kode Standar</th>
                    <th className="py-3 px-4 min-w-[280px]">Uraian & Spesifikasi</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Rekening Belanja</th>
                    <th className="py-3 px-3 w-24 text-center">Satuan</th>
                    <th className="py-3 px-4 min-w-[140px] text-right">Harga Satuan</th>
                    <th className="py-3 px-3 w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    const catCfg = CATEGORY_CONFIG[item.kategori] || CATEGORY_CONFIG.SSH;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                          {rowNumber}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block font-mono text-[10px] font-black px-2 py-0.5 rounded-md border ${catCfg.badgeBg} ${catCfg.badgeText} ${catCfg.border}`}
                          >
                            {item.kategori}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          {item.kode_standar_harga}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white leading-snug">
                            {item.nama_standar_harga}
                          </div>
                          {item.spek && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {item.spek}
                            </div>
                          )}
                          {item.kelompok_standar_harga && (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                              • {item.kelompok_standar_harga}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3.5">
                          {item.kode_akun ? (
                            <div>
                              <span className="font-mono text-[10px] text-slate-500 font-semibold block">
                                {item.kode_akun}
                              </span>
                              <span className="text-[11px] text-slate-800 dark:text-slate-200 line-clamp-1">
                                {item.nama_akun || 'Rekening Belanja'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center font-medium text-slate-700 dark:text-slate-300">
                          {item.satuan || 'Paket'}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <CurrencyText
                            amount={item.harga_satuan}
                            className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit item standar harga"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Hapus item standar harga"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer & Pagination */}
        <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <strong>{filteredItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> -{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filteredItems.length)}</strong> dari{' '}
            <strong>{filteredItems.length}</strong> item standar harga
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>
              <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Berikutnya
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={onClose}>
              Selesai & Tutup
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: IMPORT FILE EXCEL (.xlsx / .xls)                             */}
      {/* ========================================================================= */}
      {isImporting && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-850">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Import File Excel Standar Satuan Harga
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImporting(false);
                  setParsedPreviewItems(null);
                  setImportErrorMessage(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {importSuccessMessage ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Import Berhasil</h4>
                    <p className="text-xs mt-0.5">{importSuccessMessage}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Target Category & Mode Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Kategori Sasaran:
                      </label>
                      <select
                        value={importTargetCategory}
                        onChange={(e) => setImportTargetCategory(e.target.value as any)}
                        className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="AUTO">Otomatis (Sesuai Kolom / Nama Sheet)</option>
                        <option value="SSH">SSH (Standar Satuan Harga)</option>
                        <option value="HSPK">HSPK (Harga Satuan Pokok Kegiatan)</option>
                        <option value="ASB">ASB (Analisis Standar Belanja)</option>
                        <option value="SBU">SBU (Standar Biaya Umum)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Metode Impor:
                      </label>
                      <select
                        value={importMode}
                        onChange={(e) => setImportMode(e.target.value as any)}
                        className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="merge">Gabungkan dengan Data Lama (Merge)</option>
                        <option value="replace">Ganti Seluruh Database (Replace)</option>
                      </select>
                    </div>
                  </div>

                  {/* Dropzone Upload */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 dark:border-emerald-800 dark:hover:border-emerald-600 rounded-2xl p-6 text-center cursor-pointer transition-all bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/20"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Klik untuk Memilih File Excel (.xlsx / .xls)
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Mendukung format file SIPD atau template Excel Standar Harga Satuan
                    </p>
                    {importFileName && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-xs font-bold font-mono">
                        <Check className="w-3.5 h-3.5" />
                        <span>{importFileName}</span>
                      </div>
                    )}
                  </div>

                  {importErrorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{importErrorMessage}</span>
                    </div>
                  )}

                  {/* Preview Items */}
                  {parsedPreviewItems && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>
                          Pratinjau Data: <strong>{parsedPreviewItems.length}</strong> item siap diimpor
                        </span>
                        <span className="text-[11px] text-emerald-600 font-bold">
                          Format Valid ✓
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold sticky top-0">
                            <tr>
                              <th className="py-2 px-2.5">Kat</th>
                              <th className="py-2 px-2.5">Kode</th>
                              <th className="py-2 px-3">Uraian</th>
                              <th className="py-2 px-2 text-right">Harga</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {parsedPreviewItems.slice(0, 10).map((it, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-1.5 px-2.5 font-bold font-mono text-[10px] text-emerald-600">
                                  {it.kategori}
                                </td>
                                <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-500">
                                  {it.kode_standar_harga}
                                </td>
                                <td className="py-1.5 px-3 truncate max-w-[200px]">
                                  {it.nama_standar_harga}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono font-semibold">
                                  {it.harga_satuan.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {parsedPreviewItems.length > 10 && (
                        <p className="text-[11px] text-slate-400 italic text-center">
                          dan {parsedPreviewItems.length - 10} item lainnya...
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="xs"
                onClick={downloadStandarHargaTemplate}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Unduh Template Excel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setIsImporting(false);
                    setParsedPreviewItems(null);
                  }}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  disabled={!parsedPreviewItems || parsedPreviewItems.length === 0}
                  onClick={handleConfirmImport}
                  icon={<Check className="w-3.5 h-3.5" />}
                >
                  Terapkan ke Database
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: FORM TAMBAH / EDIT ITEM MANUAL                               */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-850">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingItem ? 'Edit Item Standar Harga' : 'Tambah Item Standar Harga'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Kategori Standar Harga *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['SSH', 'HSPK', 'ASB', 'SBU'] as StandarHargaCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`py-2 px-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${
                        formCategory === cat
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Kode Standar Harga *
                </label>
                <input
                  type="text"
                  required
                  value={formKode}
                  onChange={(e) => setFormKode(e.target.value)}
                  placeholder="Contoh: 1.1.12.01.03.0001.03113"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nama Barang / Uraian Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Kertas HVS (F4) 70 gr / Honorarium Narasumber"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Spesifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  value={formSpek}
                  onChange={(e) => setFormSpek(e.target.value)}
                  placeholder="Detail merk, tipe, ukuran, atau rincian spesifikasi..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Satuan Ukur *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    placeholder="Rim, Paket, Orang/Jam, M2"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Harga Satuan (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formHarga}
                    onChange={(e) => setFormHarga(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Kode Rekening Akun
                  </label>
                  <input
                    type="text"
                    value={formKodeAkun}
                    onChange={(e) => setFormKodeAkun(e.target.value)}
                    placeholder="5.1.02.01.001.00024"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Nama Rekening Akun
                  </label>
                  <input
                    type="text"
                    value={formNamaAkun}
                    onChange={(e) => setFormNamaAkun(e.target.value)}
                    placeholder="Belanja Alat Tulis Kantor"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Kelompok Standar Harga (Opsional)
                </label>
                <input
                  type="text"
                  value={formKelompok}
                  onChange={(e) => setFormKelompok(e.target.value)}
                  placeholder="Contoh: Alat Tulis Kantor, Honorarium, Gedung"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button variant="outline" size="xs" onClick={() => setIsFormOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="xs" type="submit">
                  Simpan Standar Harga
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
