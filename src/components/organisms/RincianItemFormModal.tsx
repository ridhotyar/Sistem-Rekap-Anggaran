import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Save,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Info,
  Search,
  Check,
  ChevronDown,
  Layers,
  Plus,
  Trash2,
  Calculator,
  Package,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { CurrencyText } from '../atoms/CurrencyText';
import { RincianBelanjaItem, KeteranganSubBl, StandarHargaCategory, StandarHargaItem } from '../../types/budget';
import { AppUser } from '../../types/auth';
import { INITIAL_USER_RINCIAN_DATA, INITIAL_KETERANGAN_LIST } from '../../data/initialBudgetData';
import { getStoredStandarHarga } from '../../services/standarHargaService';

export interface RincianItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: RincianBelanjaItem) => Promise<void>;
  initialData?: RincianBelanjaItem | null;
  idSubBl: number;
  tahun: number;
  idDaerah: number;
  currentUser?: AppUser | null;
  availablePackages?: Partial<KeteranganSubBl>[];
  allItems?: RincianBelanjaItem[];
  defaultKetId?: number;
  standarHargaList?: StandarHargaItem[];
}

export interface KoefisienFactor {
  id: string;
  angka: number;
  satuan: string;
}

export interface StandarHargaOption {
  id_standar_harga: number;
  kode_standar_harga: string;
  nama_standar_harga: string;
  harga_satuan: number;
  satuan_default: string;
  spek_default: string;
  kode_akun: string;
  nama_akun: string;
  id_akun: number;
  kategori?: StandarHargaCategory;
}

const PRESET_ACCOUNTS = [
  {
    kode: '5.1.02.01.001.00024',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
    id_akun: 33279,
  },
  {
    kode: '5.1.02.01.001.00025',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor- Kertas dan Cover',
    id_akun: 33280,
  },
  {
    kode: '5.1.02.01.001.00026',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor- Bahan Cetak',
    id_akun: 33281,
  },
  {
    kode: '5.1.02.01.001.00052',
    nama: 'Belanja Makanan dan Minuman Rapat',
    id_akun: 33307,
  },
  {
    kode: '5.1.02.02.001.00003',
    nama: 'Honorarium Narasumber atau Pembahas, Moderator, Pembawa Acara, dan Panitia',
    id_akun: 34103,
  },
  {
    kode: '5.1.02.04.001.00004',
    nama: 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota',
    id_akun: 36003,
  },
  {
    kode: '5.1.02.04.001.00001',
    nama: 'Belanja Perjalanan Dinas Biasa',
    id_akun: 36001,
  },
  {
    kode: '5.1.02.02.001.00026',
    nama: 'Belanja Sewa Bangunan Gedung Tempat Pertemuan',
    id_akun: 34526,
  },
];

const COMMON_SATUAN_LIST = [
  'Paket',
  'Hari',
  'Kegiatan',
  'Orang',
  'Kali',
  'Bulan',
  'Rim',
  'Lembar',
  'Buku',
  'Meter',
  'Jam',
  'Unit',
];

// Helper to parse koefisien string e.g. "1 Paket, 1 Hari, 1 Kegiatan" or "35 Orang x 2 Kali"
function parseKoefisienStringToFactors(str?: string): KoefisienFactor[] {
  if (!str || !str.trim()) {
    return [{ id: 'factor-1', angka: 1, satuan: 'Paket' }];
  }
  const parts = str.split(/[xX\*,]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    return [{ id: 'factor-1', angka: 1, satuan: 'Paket' }];
  }

  return parts.map((part, idx) => {
    const match = part.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (match) {
      return {
        id: `factor-${idx + 1}-${Date.now()}`,
        angka: parseFloat(match[1]) || 1,
        satuan: match[2]?.trim() || '',
      };
    }
    const num = parseFloat(part.match(/\d+(?:\.\d+)?/)?.[0] || '1');
    const unit = part.replace(/\d+(?:\.\d+)?/, '').trim();
    return {
      id: `factor-${idx + 1}-${Date.now()}`,
      angka: num || 1,
      satuan: unit || 'Paket',
    };
  });
}

export const RincianItemFormModal: React.FC<RincianItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  idSubBl,
  tahun,
  idDaerah,
  currentUser,
  availablePackages = [],
  allItems = [],
  defaultKetId,
  standarHargaList,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isEditing = Boolean(initialData);

  // States for base & user proposal
  const [formData, setFormData] = useState<Partial<RincianBelanjaItem>>({});
  const [userSpek, setUserSpek] = useState('');
  const [userHargaSatuan, setUserHargaSatuan] = useState<number>(50000);
  const [userTotalHarga, setUserTotalHarga] = useState<number>(50000);
  const [userCatatan, setUserCatatan] = useState('');

  // Multi-factor Koefisien state
  const [koefisienFactors, setKoefisienFactors] = useState<KoefisienFactor[]>([
    { id: 'f-1', angka: 1, satuan: 'Paket' },
  ]);

  // Kelompok Paket state
  const [selectedPackageMode, setSelectedPackageMode] = useState<'existing' | 'new'>('existing');
  const [selectedKetId, setSelectedKetId] = useState<number>(957927);
  const [newPackageName, setNewPackageName] = useState('');

  // Standar Satuan Harga dropdown & category state
  const [isSshDropdownOpen, setIsSshDropdownOpen] = useState(false);
  const [sshSearchQuery, setSshSearchQuery] = useState('');
  const [selectedShCategory, setSelectedShCategory] = useState<StandarHargaCategory | 'ALL'>('ALL');
  const sshDropdownRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compile full catalog of Standar Satuan Harga from database & excel imports
  const standarHargaCatalog = useMemo<StandarHargaOption[]>(() => {
    const map = new Map<string, StandarHargaOption>();

    // 1. Primary Source: Live Standar Harga Database (SSH / HSPK / ASB / SBU)
    const liveList = (standarHargaList && standarHargaList.length > 0)
      ? standarHargaList
      : getStoredStandarHarga();

    liveList.forEach((item) => {
      if (item.nama_standar_harga) {
        const key = `${item.kategori}-${item.nama_standar_harga.toLowerCase()}-${item.spek.toLowerCase()}`;
        map.set(key, {
          id_standar_harga: item.id_standar_harga,
          kode_standar_harga: item.kode_standar_harga,
          nama_standar_harga: item.nama_standar_harga,
          harga_satuan: item.harga_satuan,
          satuan_default: item.satuan || 'Paket',
          spek_default: item.spek || '',
          kode_akun: item.kode_akun || PRESET_ACCOUNTS[0].kode,
          nama_akun: item.nama_akun || PRESET_ACCOUNTS[0].nama,
          id_akun: item.id_akun || PRESET_ACCOUNTS[0].id_akun,
          kategori: item.kategori || 'SSH',
        });
      }
    });

    // 2. From initial JSON dataset (fallback to ensure 100% compatibility)
    INITIAL_USER_RINCIAN_DATA.forEach((item) => {
      if (item.nama_standar_harga) {
        const key = `SSH-${item.nama_standar_harga.toLowerCase()}-${(item.spek || '').toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, {
            id_standar_harga: item.id_standar_harga || 4549661,
            kode_standar_harga: item.kode_standar_harga || '1.1.12.01.03.0001.03113',
            nama_standar_harga: item.nama_standar_harga,
            harga_satuan: item.harga_satuan || 50000,
            satuan_default: String(item.koefisien || '').replace(/\d+/g, '').replace(/[xX\*,]/g, '').trim() || 'Paket',
            spek_default: item.spek || '',
            kode_akun: item.kode_akun || PRESET_ACCOUNTS[0].kode,
            nama_akun: item.nama_akun || PRESET_ACCOUNTS[0].nama,
            id_akun: item.id_akun || PRESET_ACCOUNTS[0].id_akun,
            kategori: 'SSH',
          });
        }
      }
    });

    // 3. From all active items in current session
    allItems.forEach((item) => {
      if (item.nama_standar_harga) {
        const key = `SSH-${item.nama_standar_harga.toLowerCase()}-${(item.spek || '').toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, {
            id_standar_harga: item.id_standar_harga || 4549661,
            kode_standar_harga: item.kode_standar_harga || '1.1.12.01.03.0001.03113',
            nama_standar_harga: item.nama_standar_harga,
            harga_satuan: item.harga_satuan || 50000,
            satuan_default: String(item.koefisien || '').replace(/\d+/g, '').replace(/[xX\*,]/g, '').trim() || 'Paket',
            spek_default: item.spek || '',
            kode_akun: item.kode_akun || PRESET_ACCOUNTS[0].kode,
            nama_akun: item.nama_akun || PRESET_ACCOUNTS[0].nama,
            id_akun: item.id_akun || PRESET_ACCOUNTS[0].id_akun,
            kategori: 'SSH',
          });
        }
      }
    });

    return Array.from(map.values());
  }, [standarHargaList, allItems]);

  // Counts for each category tab
  const categoryCounts = useMemo(() => {
    const counts = { ALL: standarHargaCatalog.length, SSH: 0, HSPK: 0, ASB: 0, SBU: 0 };
    standarHargaCatalog.forEach((item) => {
      if (item.kategori && counts[item.kategori] !== undefined) {
        counts[item.kategori]++;
      }
    });
    return counts;
  }, [standarHargaCatalog]);

  // Filtered Standar Satuan Harga based on active Category tab and search
  const filteredSshOptions = useMemo(() => {
    let result = standarHargaCatalog;

    // Filter by Category
    if (selectedShCategory !== 'ALL') {
      result = result.filter((opt) => opt.kategori === selectedShCategory);
    }

    // Filter by Search Query
    if (sshSearchQuery.trim()) {
      const query = sshSearchQuery.toLowerCase();
      result = result.filter(
        (opt) =>
          opt.nama_standar_harga.toLowerCase().includes(query) ||
          opt.spek_default.toLowerCase().includes(query) ||
          opt.kode_standar_harga.toLowerCase().includes(query) ||
          opt.nama_akun.toLowerCase().includes(query) ||
          (opt.kategori && opt.kategori.toLowerCase().includes(query))
      );
    }

    return result;
  }, [standarHargaCatalog, selectedShCategory, sshSearchQuery]);

  // Available packages for this sub-kegiatan
  const packageOptions = useMemo(() => {
    const list: Array<{ id_ket_sub_bl: number; ket_bl_teks: string; rincian_count?: number }> = [];
    const seen = new Set<number>();

    // 1. From props
    availablePackages.forEach((p) => {
      if (p.id_ket_sub_bl && !seen.has(p.id_ket_sub_bl)) {
        seen.add(p.id_ket_sub_bl);
        list.push({
          id_ket_sub_bl: p.id_ket_sub_bl,
          ket_bl_teks: p.ket_bl_teks || `Paket Keterangan #${p.id_ket_sub_bl}`,
          rincian_count: p.rincian_count,
        });
      }
    });

    // 2. Fallback to initial if empty
    if (list.length === 0) {
      INITIAL_KETERANGAN_LIST.forEach((k) => {
        if (!seen.has(k.id_ket_sub_bl)) {
          seen.add(k.id_ket_sub_bl);
          list.push({
            id_ket_sub_bl: k.id_ket_sub_bl,
            ket_bl_teks: k.ket_bl_teks,
            rincian_count: k.rincian_count,
          });
        }
      });
    }

    return list;
  }, [availablePackages]);

  // Click outside to close SSH dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sshDropdownRef.current && !sshDropdownRef.current.contains(event.target as Node)) {
        setIsSshDropdownOpen(false);
      }
    };
    if (isSshDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSshDropdownOpen]);

  // Initialize data on modal open
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setUserSpek(initialData.user_spek || initialData.spek || '');
      const initialPrice =
        initialData.user_harga_satuan !== undefined
          ? initialData.user_harga_satuan
          : initialData.harga_satuan || 50000;
      setUserHargaSatuan(initialPrice);

      const koefSource = initialData.user_koefisien || initialData.koefisien || '1 Paket';
      const factors = parseKoefisienStringToFactors(koefSource);
      setKoefisienFactors(factors);

      // Package selection
      const currentKetId = initialData.id_ket_sub_bl || defaultKetId || 957927;
      setSelectedKetId(currentKetId);
      setSelectedPackageMode('existing');
      setNewPackageName('');

      setUserCatatan(initialData.user_catatan || '');
    } else {
      const defaultItem: Partial<RincianBelanjaItem> = {
        id_rinci_sub_bl: Math.floor(2300000 + Math.random() * 90000),
        id_subs_sub_bl: 708290,
        id_ket_sub_bl: defaultKetId || packageOptions[0]?.id_ket_sub_bl || 957927,
        ket_bl_teks: packageOptions[0]?.ket_bl_teks || 'Paket Aktivitas Belanja',
        id_standar_harga: 4778094,
        id_sub_bl: idSubBl,
        tahun: tahun,
        id_daerah: idDaerah,
        kode_akun: PRESET_ACCOUNTS[0].kode,
        nama_akun: PRESET_ACCOUNTS[0].nama,
        id_akun: PRESET_ACCOUNTS[0].id_akun,
        kode_standar_harga: '1.1.12.01.03.0001.03113',
        nama_standar_harga: 'Alat Tulis Kantor',
        spek: 'Seminar Kit Lengkap',
        koefisien: '1 Paket',
        harga_satuan: 50000,
        total_harga: 50000,
        ssh_locked: '0',
        is_pure_otsus: 0,
      };
      setFormData(defaultItem);
      setUserSpek('Seminar Kit Lengkap');
      setUserHargaSatuan(50000);
      setKoefisienFactors([
        { id: `factor-${Date.now()}-1`, angka: 1, satuan: 'Paket' },
      ]);
      setSelectedKetId(defaultKetId || packageOptions[0]?.id_ket_sub_bl || 957927);
      setSelectedPackageMode('existing');
      setNewPackageName('');
      setUserCatatan('');
    }
    setError(null);
    setIsSshDropdownOpen(false);
    setSshSearchQuery('');
  }, [initialData, idSubBl, tahun, idDaerah, isOpen, defaultKetId, packageOptions]);

  // Recalculate total multiplication whenever factors or unit price change
  // Formula: Multiplies each factor's number, then multiplies by unit price:
  // e.g. 1 paket * 1 hari * 1 kegiatan * 50000 = 50000
  const totalVolumeMultiplier = useMemo(() => {
    if (koefisienFactors.length === 0) return 1;
    return koefisienFactors.reduce((acc, f) => {
      const num = Number(f.angka);
      return acc * (num > 0 ? num : 1);
    }, 1);
  }, [koefisienFactors]);

  const formattedKoefisienText = useMemo(() => {
    return koefisienFactors
      .map((f) => `${f.angka || 1} ${f.satuan || ''}`.trim())
      .filter(Boolean)
      .join(' x ');
  }, [koefisienFactors]);

  // Sync calculated total price
  useEffect(() => {
    const calc = totalVolumeMultiplier * (userHargaSatuan || 0);
    setUserTotalHarga(calc);
    if (isAdmin) {
      setFormData((p) => ({
        ...p,
        total_harga: calc,
        harga_satuan: userHargaSatuan,
        koefisien: formattedKoefisienText,
      }));
    }
  }, [totalVolumeMultiplier, userHargaSatuan, formattedKoefisienText, isAdmin]);

  if (!isOpen) return null;

  // Handle picking a Standar Satuan Harga from the JSON list
  const handleSelectStandarHarga = (opt: StandarHargaOption) => {
    setFormData((prev) => ({
      ...prev,
      nama_standar_harga: opt.nama_standar_harga,
      kode_standar_harga: opt.kode_standar_harga,
      id_standar_harga: opt.id_standar_harga,
      kode_akun: opt.kode_akun,
      nama_akun: opt.nama_akun,
      id_akun: opt.id_akun,
      spek: prev.spek || opt.spek_default,
    }));

    if (!userSpek.trim() || userSpek === 'Seminar Kit Lengkap') {
      setUserSpek(opt.spek_default);
    }

    setUserHargaSatuan(opt.harga_satuan);

    // Update the first factor's unit if default is available
    if (opt.satuan_default && koefisienFactors.length > 0) {
      setKoefisienFactors((prev) => {
        const copy = [...prev];
        copy[0] = { ...copy[0], satuan: opt.satuan_default };
        return copy;
      });
    }

    setIsSshDropdownOpen(false);
    setSshSearchQuery('');
  };

  // Koefisien Factor actions
  const handleAddKoefisienFactor = () => {
    setKoefisienFactors((prev) => [
      ...prev,
      {
        id: `factor-${Date.now()}-${prev.length + 1}`,
        angka: 1,
        satuan: prev.length === 1 ? 'Hari' : prev.length === 2 ? 'Kegiatan' : 'Paket',
      },
    ]);
  };

  const handleRemoveKoefisienFactor = (index: number) => {
    if (koefisienFactors.length <= 1) return;
    setKoefisienFactors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateKoefisienFactor = (
    index: number,
    field: 'angka' | 'satuan',
    value: string | number
  ) => {
    setKoefisienFactors((prev) => {
      const copy = [...prev];
      if (field === 'angka') {
        const num = parseFloat(String(value));
        copy[index] = { ...copy[index], angka: isNaN(num) ? 1 : num };
      } else {
        copy[index] = { ...copy[index], satuan: String(value) };
      }
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Package resolution
    let targetKetId = selectedKetId;
    let targetKetTeks = formData.ket_bl_teks || 'Paket Aktivitas Belanja';

    if (selectedPackageMode === 'new') {
      if (!newPackageName.trim()) {
        setError('Silakan masukkan nama kelompok paket baru.');
        return;
      }
      targetKetId = Math.floor(958000 + Math.random() * 10000);
      targetKetTeks = newPackageName.trim();
    } else {
      const foundPkg = packageOptions.find((p) => p.id_ket_sub_bl === selectedKetId);
      if (foundPkg) {
        targetKetId = foundPkg.id_ket_sub_bl;
        targetKetTeks = foundPkg.ket_bl_teks;
      }
    }

    // Validations
    if (!formData.nama_standar_harga?.trim()) {
      setError('Silakan pilih Nama Standar Satuan Harga.');
      return;
    }

    if (!isAdmin) {
      if (!userSpek.trim()) {
        setError('Uraian spesifikasi usulan tidak boleh kosong.');
        return;
      }
      if (!userTotalHarga || userTotalHarga <= 0) {
        setError('Total harga usulan harus lebih besar dari 0.');
        return;
      }
    } else {
      if (!formData.spek?.trim() && !userSpek.trim()) {
        setError('Uraian spesifikasi base tidak boleh kosong.');
        return;
      }
      if (!userTotalHarga || userTotalHarga <= 0) {
        setError('Total harga base harus lebih besar dari 0.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let payload: RincianBelanjaItem;

      const isNewItem = !isEditing;
      const baseTotal = isNewItem ? 0 : (formData.base_total_harga !== undefined ? formData.base_total_harga : formData.total_harga || 0);
      const baseHarga = isNewItem ? 0 : (formData.base_harga_satuan !== undefined ? formData.base_harga_satuan : formData.harga_satuan || 0);
      const baseKoef = isNewItem ? '' : (formData.base_koefisien !== undefined ? formData.base_koefisien : formData.koefisien || '');

      if (!isAdmin) {
        // NON-ADMIN USER PROPOSAL:
        // Keep baseline admin untouched, store user proposal in user_* fields
        payload = {
          ...(formData as RincianBelanjaItem),
          id_ket_sub_bl: targetKetId,
          ket_bl_teks: targetKetTeks,

          // Data Dasar (SEBELUM) selalu tetap
          spek: isNewItem ? userSpek : formData.spek || userSpek,
          koefisien: isNewItem ? formattedKoefisienText : baseKoef,
          harga_satuan: isNewItem ? 0 : baseHarga,
          total_harga: isNewItem ? 0 : baseTotal,
          base_total_harga: baseTotal,
          base_harga_satuan: baseHarga,
          base_koefisien: baseKoef,

          // Data Usulan (SESUDAH)
          user_spek: userSpek,
          user_koefisien: formattedKoefisienText,
          user_harga_satuan: userHargaSatuan,
          user_total_harga: userTotalHarga,
          user_catatan: userCatatan.trim() || undefined,
          user_updated_by: currentUser?.nama || 'User Biasa',
          user_updated_at: new Date().toISOString(),
          is_user_added: isNewItem ? true : formData.is_user_added,
          status_persetujuan: 'pending',
        };
      } else {
        // ADMIN EDITING:
        // Data Dasar (SEBELUM) tetap dipertahankan, nilai baru disimpan sebagai SESUDAH (user_total_harga)
        payload = {
          ...(formData as RincianBelanjaItem),
          id_ket_sub_bl: targetKetId,
          ket_bl_teks: targetKetTeks,

          // Data Dasar (SEBELUM) selalu tetap
          spek: isNewItem ? userSpek : formData.spek || userSpek,
          koefisien: isNewItem ? formattedKoefisienText : baseKoef,
          harga_satuan: isNewItem ? 0 : baseHarga,
          total_harga: isNewItem ? 0 : baseTotal,
          base_total_harga: baseTotal,
          base_harga_satuan: baseHarga,
          base_koefisien: baseKoef,

          // Data Perubahan (SESUDAH)
          user_spek: userSpek,
          user_koefisien: formattedKoefisienText,
          user_harga_satuan: userHargaSatuan,
          user_total_harga: userTotalHarga,
          user_updated_by: currentUser?.nama || 'Administrator',
          user_updated_at: new Date().toISOString(),
          is_user_added: isNewItem ? true : formData.is_user_added,
          status_persetujuan: 'disetujui',
          updated_at: new Date().toISOString(),
        };
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan rincian belanja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 sticky top-0 z-20 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {!isAdmin
                  ? isEditing
                    ? 'Penyesuaian Data Rincian Belanja (User Staf)'
                    : 'Tambah Usulan Rincian Belanja Baru (User Staf)'
                  : isEditing
                  ? 'Ubah Rincian Belanja Dasar (Admin)'
                  : 'Tambah Rincian Belanja Dasar (Admin)'}
              </h3>
              <Badge variant={isAdmin ? 'primary' : 'info'} size="xs">
                {isAdmin ? 'ADMIN' : 'USER BIASA'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sub-Kegiatan ID: {idSubBl} | TA {tahun}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Role Banner */}
        <div className="px-4 sm:px-6 pt-4">
          {!isAdmin ? (
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Mode User Biasa (Perbandingan Kolom Baru):</strong> Perubahan koefisien &
                rincian akan otomatis dihitung dan dimasukkan ke kolom{' '}
                <strong>Usulan Penyesuaian</strong>.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Mode Administrator:</strong> Anda berhak mengedit dan menentukan data dasar
                JSON SIPD secara langsung.
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reference Card if non-admin is adjusting an existing admin item */}
          {!isAdmin && isEditing && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Data Dasar Awal (JSON Admin) - Tetap Disimpan:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Koefisien Base:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formData.koefisien || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Harga Satuan Base:</span>
                  <CurrencyText
                    amount={formData.harga_satuan || 0}
                    className="font-semibold text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <span className="text-slate-400 block">Total Base:</span>
                  <CurrencyText
                    amount={formData.total_harga || 0}
                    className="font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                Spesifikasi Base: <em>{formData.spek || '-'}</em>
              </div>
            </div>
          )}

          {/* 1. KELOMPOK PAKET (Keterangan Sub Belanja) - With Option to Add New */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Kelompok Paket (Keterangan Sub Belanja)</span>
              </label>

              {/* Mode switch: existing vs new */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedPackageMode('existing')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    selectedPackageMode === 'existing'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Pilih Paket Tersedia
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPackageMode('new')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    selectedPackageMode === 'new'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  + Tambah Paket Baru
                </button>
              </div>
            </div>

            {selectedPackageMode === 'existing' ? (
              <div className="space-y-1">
                <select
                  value={selectedKetId}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelectedKetId(val);
                    const pkg = packageOptions.find((p) => p.id_ket_sub_bl === val);
                    if (pkg) {
                      setFormData((prev) => ({
                        ...prev,
                        id_ket_sub_bl: pkg.id_ket_sub_bl,
                        ket_bl_teks: pkg.ket_bl_teks,
                      }));
                    }
                  }}
                  className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {packageOptions.map((pkg, idx) => (
                    <option key={pkg.id_ket_sub_bl} value={pkg.id_ket_sub_bl}>
                      Paket #{idx + 1}: {pkg.ket_bl_teks} ({pkg.rincian_count || 0} rincian)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Rincian belanja ini akan dikelompokkan ke dalam paket aktivitas di atas.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  placeholder="Ketik nama paket aktivitas baru (contoh: Fasilitasi Forum Pembauran Kebangsaan Kab/Kota)"
                  className="w-full text-xs border border-emerald-400 dark:border-emerald-600 rounded-lg p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required={selectedPackageMode === 'new'}
                />
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Paket baru ini akan dibuat dan otomatis terdaftar pada sub-kegiatan ini.</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. NAMA STANDAR SATUAN HARGA (SSH / HSPK / ASB / SBU) */}
          <div className="space-y-1 relative" ref={sshDropdownRef}>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Standar Harga Satuan (SSH, HSPK, ASB, SBU)
              </label>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {filteredSshOptions.length} item tersedia
              </span>
            </div>

            {/* Clickable selector box */}
            <div
              onClick={() => setIsSshDropdownOpen((prev) => !prev)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-2 truncate">
                {/* Selected Item Category Badge */}
                {formData.nama_standar_harga && (
                  (() => {
                    const matched = standarHargaCatalog.find((c) => c.nama_standar_harga === formData.nama_standar_harga);
                    const kat = matched?.kategori || 'SSH';
                    const badgeClasses =
                      kat === 'SSH'
                        ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300'
                        : kat === 'HSPK'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : kat === 'ASB'
                        ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-300'
                        : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-300';
                    return (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${badgeClasses}`}>
                        {kat}
                      </span>
                    );
                  })()
                )}
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {formData.nama_standar_harga || 'Pilih Satuan Harga (SSH, HSPK, ASB, SBU)...'}
                </span>
                {formData.nama_standar_harga && (
                  <Badge variant="primary" size="xs">
                    Rp {(userHargaSatuan || 0).toLocaleString('id-ID')}
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  isSshDropdownOpen ? 'rotate-180 text-emerald-600' : ''
                }`}
              />
            </div>

            {/* Hidden Standar Satuan Harga Code stored in payload */}
            <input type="hidden" name="kode_standar_harga" value={formData.kode_standar_harga || ''} />

            {/* Interactive Dropdown with Category Tabs (Semua, SSH, HSPK, ASB, SBU) & Search */}
            {isSshDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-96 flex flex-col">
                {/* 1. Category Tabs Header */}
                <div className="p-2 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-1 items-center">
                  {(['ALL', 'SSH', 'HSPK', 'ASB', 'SBU'] as const).map((kat) => {
                    const count = categoryCounts[kat];
                    const isActive = selectedShCategory === kat;
                    return (
                      <button
                        key={kat}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShCategory(kat);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span>{kat === 'ALL' ? 'Semua' : kat}</span>
                        <span
                          className={`px-1 py-0.2 rounded-full text-[9px] ${
                            isActive
                              ? 'bg-emerald-700 text-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Search Bar inside Dropdown */}
                <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={sshSearchQuery}
                    onChange={(e) => setSshSearchQuery(e.target.value)}
                    placeholder={`Cari nama item, spesifikasi, kode, akun...`}
                    className="w-full text-xs bg-transparent border-none text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 font-medium"
                    autoFocus
                  />
                  {sshSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSshSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* 3. Items List */}
                <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-64">
                  {filteredSshOptions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        Tidak ada standar harga ditemukan
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Coba ubah kata kunci atau ganti filter kategori (SSH / HSPK / ASB / SBU).
                      </p>
                    </div>
                  ) : (
                    filteredSshOptions.map((opt) => {
                      const isSelected =
                        formData.nama_standar_harga === opt.nama_standar_harga &&
                        (!formData.kode_standar_harga || formData.kode_standar_harga === opt.kode_standar_harga);
                      const kat = opt.kategori || 'SSH';
                      const badgeClasses =
                        kat === 'SSH'
                          ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300'
                          : kat === 'HSPK'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : kat === 'ASB'
                          ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-300'
                          : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-300';

                      return (
                        <div
                          key={`${opt.kategori || 'SSH'}-${opt.id_standar_harga}-${opt.kode_standar_harga}-${opt.nama_standar_harga}`}
                          onClick={() => handleSelectStandarHarga(opt)}
                          className={`p-3 text-xs cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-semibold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase shrink-0 ${badgeClasses}`}>
                                {kat}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {opt.nama_standar_harga}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </div>
                            {opt.spek_default && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                <span className="font-semibold text-slate-600 dark:text-slate-300">Spek:</span> {opt.spek_default}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                              <span>Kode: {opt.kode_standar_harga}</span>
                              <span>•</span>
                              <span className="truncate">{opt.nama_akun}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 block text-xs">
                              Rp {opt.harga_satuan.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              / {opt.satuan_default || 'Paket'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. REKENING AKUN BELANJA DAERAH */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rekening Belanja Daerah (Akun Belanja)
            </label>
            <select
              value={formData.kode_akun}
              onChange={(e) => {
                const acc = PRESET_ACCOUNTS.find((a) => a.kode === e.target.value);
                if (acc) {
                  setFormData((prev) => ({
                    ...prev,
                    kode_akun: acc.kode,
                    nama_akun: acc.nama,
                    id_akun: acc.id_akun,
                  }));
                }
              }}
              disabled={!isAdmin && isEditing}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-75 disabled:bg-slate-100"
            >
              {PRESET_ACCOUNTS.map((acc) => (
                <option key={acc.kode} value={acc.kode}>
                  {acc.kode} - {acc.nama}
                </option>
              ))}
            </select>
          </div>

          {/* 4. URAIAN SPESIFIKASI */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {!isAdmin
                ? 'Uraian Spesifikasi Teknis Usulan Anda'
                : 'Uraian Spesifikasi Teknis Barang / Jasa (Base)'}
            </label>
            <textarea
              value={userSpek}
              onChange={(e) => setUserSpek(e.target.value)}
              placeholder="Tuliskan spesifikasi detail (contoh: Kertas HVS F4 70gr, Seminar Kit, Snack Kotak, dsb)"
              rows={2}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          {/* 5. KOEFISIEN USULAN - Multi-faktor Builder: User bisa menambah koefisien baru */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {!isAdmin ? 'Koefisien Usulan (Faktor Perkalian)' : 'Koefisien Belanja (Faktor Perkalian)'}
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tambahkan faktor koefisien baru (misal: 1 paket, 1 hari, 1 kegiatan). Sistem akan mengalikan semua angka lalu dikalikan harga satuan.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAddKoefisienFactor}
                icon={<Plus className="w-3.5 h-3.5" />}
                className="bg-white dark:bg-slate-900 cursor-pointer font-bold text-emerald-700 dark:text-emerald-300 border-emerald-300/80"
              >
                + Tambah Koefisien Baru
              </Button>
            </div>

            {/* List of Koefisien Factor Rows */}
            <div className="space-y-2">
              {koefisienFactors.map((factor, idx) => (
                <div
                  key={factor.id || idx}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                >
                  <span className="text-[11px] font-bold text-slate-400 w-16 shrink-0">
                    Faktor #{idx + 1}
                  </span>

                  {/* Input Angka / Volume */}
                  <div className="w-24 shrink-0">
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={factor.angka}
                      onChange={(e) =>
                        handleUpdateKoefisienFactor(idx, 'angka', e.target.value)
                      }
                      className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center focus:ring-1 focus:ring-emerald-500"
                      placeholder="Angka"
                      required
                    />
                  </div>

                  <span className="text-slate-400 text-xs font-bold">×</span>

                  {/* Input Satuan (with presets) */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={factor.satuan}
                      onChange={(e) =>
                        handleUpdateKoefisienFactor(idx, 'satuan', e.target.value)
                      }
                      placeholder="Satuan (misal: Paket, Hari, Kegiatan, Orang)"
                      className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Quick preset selector buttons for unit */}
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    {['Paket', 'Hari', 'Kegiatan', 'Orang'].map((sat) => (
                      <button
                        key={sat}
                        type="button"
                        onClick={() => handleUpdateKoefisienFactor(idx, 'satuan', sat)}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                          factor.satuan.toLowerCase() === sat.toLowerCase()
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {sat}
                      </button>
                    ))}
                  </div>

                  {/* Delete button (if more than 1 factor) */}
                  {koefisienFactors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKoefisienFactor(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer shrink-0"
                      title="Hapus faktor koefisien ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Arithmetic Formula Display Banner */}
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 text-xs text-emerald-950 dark:text-emerald-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Teks Koefisien: <strong>{formattedKoefisienText || '-'}</strong>
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  Total Volume Multiplier: {totalVolumeMultiplier}
                </span>
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-mono">
                Kalkulasi: {koefisienFactors.map((f) => f.angka || 1).join(' × ')} = {totalVolumeMultiplier}{' '}
                × Rp {(userHargaSatuan || 0).toLocaleString('id-ID')} ={' '}
                <strong className="text-emerald-900 dark:text-white">
                  Rp {(userTotalHarga || 0).toLocaleString('id-ID')}
                </strong>
              </div>
            </div>
          </div>

          {/* 6. HARGA SATUAN & TOTAL USULAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Harga Satuan Standar (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={userHargaSatuan}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setUserHargaSatuan(val);
                }}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Tarif satuan sesuai Standar Satuan Harga (SSH)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Anggaran Usulan (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={userTotalHarga}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setUserTotalHarga(val);
                }}
                className="w-full text-xs p-2.5 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 focus:ring-1 focus:ring-emerald-500 font-mono font-extrabold text-sm"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Dihitung otomatis: {totalVolumeMultiplier} × Rp {(userHargaSatuan || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* 7. CATATAN / ALASAN PENYESUAIAN */}
          {!isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan / Justifikasi Usulan (Opsional)
              </label>
              <input
                type="text"
                value={userCatatan}
                onChange={(e) => setUserCatatan(e.target.value)}
                placeholder="Contoh: Penyesuaian kebutuhan peserta rapat dan penambahan durasi kegiatan"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Preview Calculated Amount Summary */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800/80 dark:to-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                Total Usulan Anggaran Belanja:
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {formattedKoefisienText}
              </span>
            </div>
            <CurrencyText
              amount={userTotalHarga}
              className="text-lg sm:text-xl text-emerald-800 dark:text-emerald-300 font-extrabold"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmitting}
              icon={<Save className="w-4 h-4" />}
            >
              {!isAdmin ? 'Simpan Usulan Rincian' : 'Simpan Data Base'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
