import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Layers,
  Database,
  Check,
  ChevronRight,
  Filter,
  DollarSign,
  Tag,
  Building2,
  FileText,
  X,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Card } from '../atoms/Card';
import { CurrencyText } from '../atoms/CurrencyText';
import { Breadcrumb } from '../molecules/Breadcrumb';
import { StandarHargaItem, StandarHargaCategory } from '../../types/budget';
import {
  parseExcelFile,
  exportStandarHargaToExcel,
  downloadStandarHargaTemplate,
  resetStandarHargaToDefault,
  saveStoredStandarHarga,
} from '../../services/standarHargaService';
import { useRouter } from '../../services/router';

export interface StandarHargaPageProps {
  standarHargaList: StandarHargaItem[];
  onUpdateStandarHargaList: (newList: StandarHargaItem[]) => void;
  isAdmin?: boolean;
}

export const CATEGORY_CONFIG: Record<
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
    description: 'Harga satuan barang/jasa kebutuhan operasional kantor, ATK, bahan cetak, makan rapat, BBM, dsb.',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    colorHex: '#059669',
  },
  HSPK: {
    label: 'HSPK',
    fullName: 'Harga Satuan Pokok Kegiatan',
    description: 'Standar harga satuan pekerjaan konstruksi fisik, pemeliharaan gedung, sarana jalan, dan instalasi.',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/80',
    badgeText: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    colorHex: '#2563eb',
  },
  ASB: {
    label: 'ASB',
    fullName: 'Analisis Standar Belanja',
    description: 'Standar pagu biaya paket kegiatan terstruktur non-fisik (rapat koordinasi, bimtek, sosialisasi, monev).',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/80',
    badgeText: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    colorHex: '#9333ea',
  },
  SBU: {
    label: 'SBU',
    fullName: 'Standar Biaya Umum',
    description: 'Batas tertinggi honorarium narasumber/moderator/panitia, uang harian perjalanan dinas, dan uang saku.',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    colorHex: '#d97706',
  },
};

export const StandarHargaPage: React.FC<StandarHargaPageProps> = ({
  standarHargaList,
  onUpdateStandarHargaList,
  isAdmin = true,
}) => {
  const { navigate } = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<StandarHargaCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Import Excel State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importTargetCategory, setImportTargetCategory] = useState<StandarHargaCategory | 'AUTO'>('AUTO');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [parsedPreviewItems, setParsedPreviewItems] = useState<StandarHargaItem[] | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Add / Edit Manual State
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

  // Filtered List based on category tab & search
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

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

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

    let updatedList: StandarHargaItem[];
    if (importMode === 'replace') {
      updatedList = parsedPreviewItems;
    } else {
      const existingMap = new Map(standarHargaList.map((i) => [i.kode_standar_harga.toLowerCase(), i]));
      parsedPreviewItems.forEach((newItem) => {
        existingMap.set(newItem.kode_standar_harga.toLowerCase(), newItem);
      });
      updatedList = Array.from(existingMap.values());
    }

    saveStoredStandarHarga(updatedList);
    onUpdateStandarHargaList(updatedList);
    setImportSuccessMessage(`Berhasil mengimpor ${parsedPreviewItems.length} item standar harga.`);
    setParsedPreviewItems(null);
    setTimeout(() => {
      setIsImportOpen(false);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Top Breadcrumb & Title */}
      <div className="space-y-3">
        <Breadcrumb
          items={[
            { label: 'Dasbor Utama', onClick: () => navigate('/dashboard') },
            { label: 'Standar Satuan Harga (SSH, HSPK, ASB, SBU)' },
          ]}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-500 text-white shadow-md shadow-emerald-900/10 shrink-0">
              <Database className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Standar Satuan Harga Daerah
                </h1>
                <Badge variant="primary" size="sm" className="font-bold">
                  {standarHargaList.length} Item Database
                </Badge>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  TA 2027
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                Katalog acuan belanja standar satuan harga (SSH), pokok kegiatan (HSPK), standar belanja (ASB), dan biaya umum (SBU) yang terhubung langsung ke rincian anggaran SIPD Bakesbangpoldagri Provinsi NTB.
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadStandarHargaTemplate}
              icon={<Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />}
              title="Unduh format file template Excel (.xlsx)"
            >
              <span className="hidden sm:inline">Download</span> Template Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportStandarHargaToExcel(standarHargaList)}
              icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              title="Ekspor seluruh database ke file Excel"
            >
              Export Excel
            </Button>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setParsedPreviewItems(null);
                  setImportErrorMessage(null);
                  setImportSuccessMessage(null);
                  setIsImportOpen(true);
                }}
                icon={<Upload className="w-3.5 h-3.5 text-blue-600" />}
                className="border-blue-200 hover:bg-blue-50 text-blue-700 dark:text-blue-300"
              >
                Import Excel
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAdd}
                icon={<Plus className="w-4 h-4" />}
                className="shadow-md shadow-emerald-700/20"
              >
                Tambah Item
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards per Category */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Card */}
        <div
          onClick={() => setSelectedCategory('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-emerald-950/80 dark:border-emerald-600 shadow-md ring-2 ring-slate-900 dark:ring-emerald-500'
              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-400 mb-1">
            <span>Total Database</span>
            <Database className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-black">{categoryCounts.ALL}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-1">
            Semua kategori standar harga
          </div>
        </div>

        {/* SSH Card */}
        <div
          onClick={() => setSelectedCategory('SSH')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'SSH'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
            <span>SSH</span>
            <Badge variant="primary" size="xs">Operasional</Badge>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {categoryCounts.SSH}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Standar Satuan Harga
          </div>
        </div>

        {/* HSPK Card */}
        <div
          onClick={() => setSelectedCategory('HSPK')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'HSPK'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
            <span>HSPK</span>
            <Badge variant="info" size="xs">Fisik/Konstruksi</Badge>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {categoryCounts.HSPK}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Harga Satuan Pokok Kegiatan
          </div>
        </div>

        {/* ASB Card */}
        <div
          onClick={() => setSelectedCategory('ASB')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'ASB'
              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 ring-2 ring-purple-500 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">
            <span>ASB</span>
            <Badge variant="secondary" size="xs">Analisis Kegiatan</Badge>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {categoryCounts.ASB}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Analisis Standar Belanja
          </div>
        </div>

        {/* SBU Card */}
        <div
          onClick={() => setSelectedCategory('SBU')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'SBU'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
            <span>SBU</span>
            <Badge variant="warning" size="xs">Honor / Dinas</Badge>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {categoryCounts.SBU}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Standar Biaya Umum
          </div>
        </div>
      </div>

      {/* 3. Main Data Card with Category Filter Tabs & Search */}
      <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
        {/* Category Tabs Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 px-6 pt-4 pb-0 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'SSH', 'HSPK', 'ASB', 'SBU'] as const).map((cat) => {
              const isActive = selectedCategory === cat;
              const count = categoryCounts[cat];
              const config = cat !== 'ALL' ? CATEGORY_CONFIG[cat] : null;

              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-emerald-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>{cat === 'ALL' ? 'Semua Standar Harga' : `${cat} - ${config?.fullName}`}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <button
              onClick={handleResetDefault}
              className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 py-2 font-medium cursor-pointer transition-colors"
              title="Reset seluruh database standar harga ke setelan resmi bawaan SIPD"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data ke Bawaan</span>
            </button>
          )}
        </div>

        {/* Search & Entries Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari uraian barang, spesifikasi, kode, rekening akun..."
              className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none font-semibold cursor-pointer"
              >
                <option value={10}>10 item</option>
                <option value={15}>15 item</option>
                <option value={25}>25 item</option>
                <option value={50}>50 item</option>
                <option value={100}>100 item</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 w-12 text-center">No.</th>
                <th className="py-3 px-4 w-24">Kategori</th>
                <th className="py-3 px-4 w-48">Kode Standar</th>
                <th className="py-3 px-4 min-w-[280px]">Uraian Barang/Jasa & Spesifikasi</th>
                <th className="py-3 px-4 min-w-[200px]">Rekening Akun Belanja</th>
                <th className="py-3 px-4 w-24 text-center">Satuan</th>
                <th className="py-3 px-4 w-36 text-right">Harga Satuan</th>
                {isAdmin && <th className="py-3 px-4 w-24 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Tidak ada standar harga yang cocok
                      </p>
                      <p className="text-xs text-slate-500">
                        {searchQuery
                          ? `Tidak ditemukan hasil dengan kata kunci "${searchQuery}". Coba gunakan istilah pencarian lain.`
                          : 'Belum ada data untuk kategori ini. Anda dapat mengimpor file Excel atau menambahkan item secara manual.'}
                      </p>
                      {isAdmin && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Button size="xs" variant="primary" onClick={handleOpenAdd} icon={<Plus className="w-3.5 h-3.5" />}>
                            Tambah Item
                          </Button>
                          <Button size="xs" variant="outline" onClick={() => setIsImportOpen(true)} icon={<Upload className="w-3.5 h-3.5" />}>
                            Import Excel
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const config = CATEGORY_CONFIG[item.kategori] || CATEGORY_CONFIG.SSH;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {globalIdx}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-extrabold text-[10px] border uppercase ${config.badgeBg} ${config.badgeText} ${config.border}`}
                          title={config.fullName}
                        >
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {item.kode_standar_harga}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {item.nama_standar_harga}
                        </div>
                        {item.spek && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            <span className="font-medium text-slate-600 dark:text-slate-300">Spek:</span> {item.spek}
                          </div>
                        )}
                        {item.kelompok_standar_harga && (
                          <span className="inline-block text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                            Kelompok: {item.kelompok_standar_harga}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.kode_akun ? (
                          <div>
                            <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                              {item.kode_akun}
                            </div>
                            <div className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-1 font-medium">
                              {item.nama_akun || 'Belanja Operasional'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                          {item.satuan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-xs">
                          Rp {item.harga_satuan.toLocaleString('id-ID')}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Edit item standar harga ini"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Hapus item standar harga ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredItems.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Menampilkan{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.min(filteredItems.length, (currentPage - 1) * itemsPerPage + 1)}
              </span>{' '}
              sampai{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.min(filteredItems.length, currentPage * itemsPerPage)}
              </span>{' '}
              dari{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {filteredItems.length}
              </span>{' '}
              item
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
              >
                &larr; Sebelumnya
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  p = currentPage - 3 + i;
                  if (p > totalPages) p = totalPages - (4 - i);
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                      currentPage === p
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Selanjutnya &rarr;
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Sub-Modal: Add / Edit Item Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Item Standar Harga' : 'Tambah Item Standar Harga'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Masukkan data satuan harga resmi SIPD NTB TA 2027
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Standar Harga *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['SSH', 'HSPK', 'ASB', 'SBU'] as const).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setFormCategory(cat)}
                      className={`p-2 rounded-xl font-black text-xs border text-center transition-all cursor-pointer ${
                        formCategory === cat
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kode & Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Standar *
                  </label>
                  <input
                    type="text"
                    required
                    value={formKode}
                    onChange={(e) => setFormKode(e.target.value)}
                    placeholder="Contoh: 1.1.12.01.03..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Satuan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    placeholder="Contoh: Paket, Rim, Orang..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nama Standar Harga */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama / Uraian Barang & Jasa *
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Alat Tulis Kantor, Kertas HVS F4..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Spesifikasi */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Spesifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  value={formSpek}
                  onChange={(e) => setFormSpek(e.target.value)}
                  placeholder="Detail ukuran, merek, kualitas, atau kriteria teknis..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Harga Satuan */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Harga Satuan (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
                  value={formHarga}
                  onChange={(e) => setFormHarga(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Rekening Akun Belanja */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Rekening Akun
                  </label>
                  <input
                    type="text"
                    value={formKodeAkun}
                    onChange={(e) => setFormKodeAkun(e.target.value)}
                    placeholder="Contoh: 5.1.02.01.001..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Rekening Akun
                  </label>
                  <input
                    type="text"
                    value={formNamaAkun}
                    onChange={(e) => setFormNamaAkun(e.target.value)}
                    placeholder="Nama belanja..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsFormOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" icon={<Check className="w-4 h-4" />}>
                  {editingItem ? 'Simpan Perubahan' : 'Tambah ke Database'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Sub-Modal: Import File Excel */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Import File Excel Standar Satuan Harga
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mendukung format file .xlsx dan .xls (SSH, HSPK, ASB, SBU)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Instructions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Petunjuk Format Kolom Excel:
                  </span>
                  <button
                    onClick={downloadStandarHargaTemplate}
                    className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Unduh Template Resmi
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Kolom yang didukung: <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Kategori</code> (SSH, HSPK, ASB, SBU), <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Kode Standar Harga</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Uraian / Nama</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Spesifikasi</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Satuan</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Harga Satuan</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Kode Akun</code>, dan <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Nama Akun</code>.
                </p>
              </div>

              {/* Import Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Kategori Standar
                  </label>
                  <select
                    value={importTargetCategory}
                    onChange={(e) => setImportTargetCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="AUTO">Otomatis (Baca dari Kolom / Nama Sheet Excel)</option>
                    <option value="SSH">SSH - Standar Satuan Harga</option>
                    <option value="HSPK">HSPK - Harga Satuan Pokok Kegiatan</option>
                    <option value="ASB">ASB - Analisis Standar Belanja</option>
                    <option value="SBU">SBU - Standar Biaya Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Penyimpanan Data
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="merge">Gabungkan & Perbarui (Merge / Update Data)</option>
                    <option value="replace">Ganti Seluruh Data (Replace Database)</option>
                  </select>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {importFileName ? importFileName : 'Klik atau seret file Excel ke sini'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Format berkas .xlsx atau .xls (Ukuran maksimal 15MB)
                </p>
              </div>

              {/* Error & Success Alerts */}
              {importErrorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">{importErrorMessage}</span>
                </div>
              )}

              {importSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-semibold">{importSuccessMessage}</span>
                </div>
              )}

              {/* Preview Table */}
              {parsedPreviewItems && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Pratinjau Hasil Pembacaan ({parsedPreviewItems.length} baris):
                    </span>
                    <Badge variant="primary" size="xs">
                      Valid & Siap Diimpor
                    </Badge>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedPreviewItems.slice(0, 10).map((preview, i) => (
                      <div key={i} className="p-2.5 text-xs flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded font-bold text-[9px] bg-slate-200 dark:bg-slate-700">
                              {preview.kategori}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {preview.nama_standar_harga}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {preview.kode_standar_harga} • {preview.spek}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-emerald-600 block">
                            Rp {preview.harga_satuan.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-slate-400">/ {preview.satuan}</span>
                        </div>
                      </div>
                    ))}
                    {parsedPreviewItems.length > 10 && (
                      <div className="p-2 text-center text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800">
                        ... dan {parsedPreviewItems.length - 10} item lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-2 text-xs">
              <Button variant="ghost" size="sm" onClick={() => setIsImportOpen(false)}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!parsedPreviewItems || parsedPreviewItems.length === 0}
                onClick={handleConfirmImport}
                icon={<Upload className="w-3.5 h-3.5" />}
              >
                Konfirmasi & Impor ke Database
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
