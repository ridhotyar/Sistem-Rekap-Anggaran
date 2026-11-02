import React, { useState } from 'react';
import {
  X,
  Upload,
  Download,
  RotateCcw,
  Check,
  AlertCircle,
  Copy,
  Merge,
  FileCode,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { CurrencyText } from '../atoms/CurrencyText';
import { RincianBelanjaItem, KeteranganSubBl, SubKegiatan } from '../../types/budget';
import {
  SAMPLE_JSON_1_KETERANGAN,
  SAMPLE_JSON_2_RINCIAN,
  INITIAL_USER_RINCIAN_DATA,
  INITIAL_KETERANGAN_SUB_BL,
  INITIAL_SUB_KEGIATAN_LIST,
  SUBS_SUB_BL_NAMES,
} from '../../data/initialBudgetData';

export interface MergedOutputData {
  status_code: number;
  status: boolean;
  message: string;
  generated_at: string;
  sub_kegiatan: Partial<SubKegiatan>;
  keterangan_paket: Partial<KeteranganSubBl>;
  ringkasan: {
    total_pagu: number;
    total_rincian_item: number;
    jumlah_kelompok_subs: number;
    jumlah_rekening_akun: number;
  };
  rincian_belanja: RincianBelanjaItem[];
}

export interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentItems: RincianBelanjaItem[];
  activeSubKegiatan?: SubKegiatan | null;
  onApplyDualJson: (
    mergedSubKegiatan: SubKegiatan,
    mergedRincian: RincianBelanjaItem[]
  ) => Promise<void>;
  onResetToDefault: () => Promise<void>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  currentItems,
  activeSubKegiatan,
  onApplyDualJson,
  onResetToDefault,
}) => {
  const [activeTab, setActiveTab] = useState<'dual_import' | 'export_unified' | 'quick_import'>('dual_import');

  // Dual JSON Inputs
  const [json1Input, setJson1Input] = useState('');
  const [json2Input, setJson2Input] = useState('');

  // Single Quick Input
  const [quickJsonInput, setQuickJsonInput] = useState('');

  // Merged result preview
  const [mergedPreview, setMergedPreview] = useState<MergedOutputData | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Load sample data into JSON 1 and JSON 2
  const handleLoadSamples = () => {
    setJson1Input(SAMPLE_JSON_1_KETERANGAN);
    setJson2Input(SAMPLE_JSON_2_RINCIAN);
    setError(null);
    setSuccessMsg('Contoh 2 JSON SIPD berhasil dimuat. Klik "Proses Penggabungan 2 JSON" untuk melihat hasil 1 output data.');
  };

  // Merge the 2 JSON inputs into 1 output data
  const handleMerge2Json = () => {
    setError(null);
    setSuccessMsg(null);
    setMergedPreview(null);

    if (!json1Input.trim()) {
      setError('Harap masukkan JSON 1 (Data Keterangan / Header Sub-Kegiatan).');
      return;
    }
    if (!json2Input.trim()) {
      setError('Harap masukkan JSON 2 (Data Rincian Belanja Sub-Kegiatan).');
      return;
    }

    try {
      // 1. Parse JSON 1 (Keterangan / Header Sub-Kegiatan)
      const parsed1 = JSON.parse(json1Input);
      const allKeteranganList: KeteranganSubBl[] = Array.isArray(parsed1.data)
        ? parsed1.data
        : Array.isArray(parsed1)
        ? parsed1
        : [parsed1];

      if (allKeteranganList.length === 0 || !allKeteranganList[0]) {
        throw new Error('JSON 1 tidak memiliki data keterangan/header sub-kegiatan yang valid.');
      }

      // Map each Keterangan by id_ket_sub_bl
      const ketMap = new Map<number, KeteranganSubBl>();
      allKeteranganList.forEach((k) => {
        if (k.id_ket_sub_bl) {
          ketMap.set(Number(k.id_ket_sub_bl), k);
        }
      });

      const primaryHeader = allKeteranganList[0];
      const idSubBl = Number(primaryHeader.id_sub_bl || 122054);

      // 2. Parse JSON 2 (Rincian Belanja)
      const parsed2 = JSON.parse(json2Input);
      const rawRincianList: any[] = Array.isArray(parsed2.data)
        ? parsed2.data
        : Array.isArray(parsed2)
        ? parsed2
        : [];

      // Filter: data yang tidak memiliki rincian agar tidak ditampilkan
      if (rawRincianList.length === 0) {
        throw new Error('Data pada JSON 2 tidak memiliki rincian belanja. Data tanpa rincian tidak dapat diproses.');
      }

      // Merge and enrich each rincian item with its respective id_ket_sub_bl
      const enrichedRincian: RincianBelanjaItem[] = rawRincianList.map((item, index) => {
        const idRinci = Number(item.id_rinci_sub_bl || 2300000 + index);
        const idSubs = Number(item.id_subs_sub_bl || 708288);
        const subsName = SUBS_SUB_BL_NAMES[idSubs] || item.nama_subs_sub_bl || `Kelompok Subs #${idSubs}`;

        // Match with specific Keterangan Sub Belanja
        const itemKetId = Number(item.id_ket_sub_bl || primaryHeader.id_ket_sub_bl || 957927);
        const matchingKet = ketMap.get(itemKetId) || primaryHeader;
        const ketTeks = matchingKet?.ket_bl_teks || item.ket_bl_teks || 'Rincian Belanja Sub-Kegiatan';

        return {
          id: `rinci-${idRinci}`,
          id_rinci_sub_bl: idRinci,
          id_subs_sub_bl: idSubs,
          nama_subs_sub_bl: subsName,
          id_ket_sub_bl: itemKetId,
          ket_bl_teks: ketTeks,
          id_sub_bl: idSubBl,
          tahun: Number(primaryHeader.tahun || item.tahun || 2027),
          id_daerah: Number(primaryHeader.id_daerah || item.id_daerah || 407),
          id_standar_harga: Number(item.id_standar_harga || 0),
          kode_standar_harga: String(item.kode_standar_harga || ''),
          koefisien: String(item.koefisien || '1 Paket'),
          harga_satuan: Number(item.harga_satuan || 0),
          total_harga: Number(item.total_harga || 0),
          id_akun: Number(item.id_akun || 0),
          kode_akun: String(item.kode_akun || ''),
          nama_akun: String(item.nama_akun || ''),
          nama_standar_harga: String(item.nama_standar_harga || ''),
          spek: String(item.spek || ''),
          akun_locked: item.akun_locked ?? null,
          ssh_locked: String(item.ssh_locked ?? '0'),
          penerima_bantuan: item.penerima_bantuan ?? null,
          is_pure_otsus: Number(item.is_pure_otsus ?? 0),
          updated_at: new Date().toISOString(),
        };
      });

      // Filter: Hanya simpan Keterangan yang memiliki rincian belanja aktif
      const activeKeteranganList = allKeteranganList.filter((k) => {
        return enrichedRincian.some((r) => r.id_ket_sub_bl === k.id_ket_sub_bl);
      });

      const finalKeteranganList = activeKeteranganList.length > 0 ? activeKeteranganList : allKeteranganList;

      const totalPagu = enrichedRincian.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
      const uniqueAkunCount = new Set(enrichedRincian.map((i) => i.kode_akun)).size;
      const uniqueSubsCount = new Set(enrichedRincian.map((i) => i.id_subs_sub_bl)).size;

      // Construct merged SubKegiatan
      const mergedSubKegiatan: SubKegiatan = {
        id: `sub-${idSubBl}`,
        id_sub_bl: idSubBl,
        id_sub_giat: primaryHeader.id_sub_giat || 54528,
        kode_sub_kegiatan: primaryHeader.kode_sub_giat || '8.01.02.1.01.0001',
        nama_sub_kegiatan:
          primaryHeader.nama_sub_giat ||
          primaryHeader.nama_sub_bl ||
          'Perumusan Kebijakan Teknis di Bidang Ideologi Wawasan Kebangsaan, Bela Negara, Karakter Bangsa, Pembauran Kebangsaan, Bhineka Tunggal Ika dan Sejarah Kebangsaan',
        id_giat: primaryHeader.id_giat || 12816,
        nama_giat: primaryHeader.nama_giat || 'Perumusan Kebijakan Teknis dan Pemantapan Pelaksanaan Bidang Ideologi Pancasila dan Karakter Kebangsaan',
        nama_kegiatan: primaryHeader.nama_giat || 'Perumusan Kebijakan Teknis dan Pemantapan Pelaksanaan Bidang Ideologi Pancasila dan Karakter Kebangsaan',
        id_program: primaryHeader.id_program || 7554,
        nama_program: primaryHeader.nama_program || 'PROGRAM PENGUATAN IDEOLOGI PANCASILA DAN KARAKTER KEBANGSAAN',
        id_skpd: primaryHeader.id_skpd || 82,
        id_unit: primaryHeader.id_unit || 82,
        nama_skpd: primaryHeader.nama_skpd || 'Badan Kesatuan Bangsa dan Politik Dalam Negeri',
        nama_unit: primaryHeader.nama_unit || 'Badan Kesatuan Bangsa dan Politik Dalam Negeri',
        nama_daerah: primaryHeader.nama_daerah || 'Provinsi Nusa Tenggara Barat',
        tahun: Number(primaryHeader.tahun || 2027),
        id_daerah: Number(primaryHeader.id_daerah || 407),
        pagu_indikatif: totalPagu,
        rincian_count: enrichedRincian.length,
        total_rincian: totalPagu,
        status_verifikasi: 'Disetujui',
        keterangan_list: finalKeteranganList,
      };

      // Construct Unified Single Output Object
      const unifiedOutput: MergedOutputData = {
        status_code: 200,
        status: true,
        message: 'Berhasil menggabungkan 2 JSON SIPD menjadi 1 data terpadu',
        generated_at: new Date().toISOString(),
        sub_kegiatan: mergedSubKegiatan,
        keterangan_paket: primaryHeader,
        ringkasan: {
          total_pagu: totalPagu,
          total_rincian_item: enrichedRincian.length,
          jumlah_kelompok_subs: uniqueSubsCount,
          jumlah_rekening_akun: uniqueAkunCount,
        },
        rincian_belanja: enrichedRincian,
      };

      setMergedPreview(unifiedOutput);
      setSuccessMsg(
        `2 JSON berhasil digabungkan! Ditemukan ${finalKeteranganList.length} Keterangan Sub Belanja dan ${enrichedRincian.length} rincian belanja.`
      );
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses penggabungan 2 JSON. Periksa kembali struktur sintaks JSON.');
    }
  };

  // Apply merged data to app and Firestore
  const handleApplyMergedData = async () => {
    if (!mergedPreview) return;
    try {
      setIsLoading(true);
      await onApplyDualJson(
        mergedPreview.sub_kegiatan as SubKegiatan,
        mergedPreview.rincian_belanja
      );
      setSuccessMsg('Data hasil penggabungan berhasil diterapkan ke sistem & database!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data gabungan.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to default 12 items
  const handleReset = async () => {
    if (window.confirm('Kembalikan ke data awal bawaan (12 item rincian anggaran Bakesbangpoldagri)?')) {
      try {
        setIsLoading(true);
        await onResetToDefault();
        setSuccessMsg('Data telah direset ke format awal.');
        setTimeout(() => onClose(), 1000);
      } catch (err: any) {
        setError(err?.message || 'Gagal mereset data.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Unified output string representation
  const unifiedOutputString = JSON.stringify(
    mergedPreview || {
      status_code: 200,
      status: true,
      message: '1 Output Data Hasil Penggabungan SIPD',
      generated_at: new Date().toISOString(),
      sub_kegiatan: activeSubKegiatan || INITIAL_SUB_KEGIATAN_LIST[0],
      keterangan_paket: INITIAL_KETERANGAN_SUB_BL,
      ringkasan: {
        total_pagu: currentItems.reduce((acc, c) => acc + (c.total_harga || 0), 0),
        total_rincian_item: currentItems.length,
        jumlah_rekening_akun: new Set(currentItems.map((i) => i.kode_akun)).size,
      },
      rincian_belanja: currentItems,
    },
    null,
    2
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(unifiedOutputString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadUnifiedJson = () => {
    const blob = new Blob([unifiedOutputString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sipd_unified_output_sub_bl_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Merge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Integrasi & Import Data 2 JSON SIPD &rarr; 1 Output Data
              </h3>
              <p className="text-xs text-slate-500">
                Menggabungkan JSON Header/Keterangan Sub-Kegiatan + JSON Rincian Belanja dan memfilter data tanpa rincian
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 gap-6 text-xs sm:text-sm font-medium bg-slate-50/50 dark:bg-slate-800/40">
          <button
            onClick={() => setActiveTab('dual_import')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'dual_import'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Merge className="w-4 h-4" />
            <span>Import 2 JSON (Gabung Otomatis)</span>
          </button>

          <button
            onClick={() => setActiveTab('export_unified')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'export_unified'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1 Output Data (Hasil Gabungan)</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-200">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: DUAL JSON IMPORT */}
          {activeTab === 'dual_import' && (
            <div className="space-y-5">
              {/* Top Action & Instructions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Sistem akan memetakan relasi <strong>ID Sub BL</strong> &amp; <strong>ID Keterangan Sub BL</strong>, dan secara otomatis <strong>mengabaikan data yang tidak memiliki rincian</strong>.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleLoadSamples}
                  className="bg-white dark:bg-slate-900 border-emerald-300 text-emerald-800 shrink-0 font-medium"
                >
                  Muat Contoh 2 JSON
                </Button>
              </div>

              {/* Side-by-side Dual JSON Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* JSON 1 Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                      <span>JSON 1: Data Keterangan / Header Sub-Kegiatan</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (id_ket_sub_bl, id_sub_bl, nama_sub_giat...)
                    </span>
                  </div>
                  <textarea
                    value={json1Input}
                    onChange={(e) => setJson1Input(e.target.value)}
                    placeholder={`{\n  "status_code": 200,\n  "data": [\n    {\n      "id_ket_sub_bl": 957927,\n      "id_sub_bl": 122054,\n      "ket_bl_teks": "Rapat Koordinasi...",\n      "nama_sub_giat": "Perumusan Kebijakan Teknis..."\n    }\n  ]\n}`}
                    rows={9}
                    className="w-full text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* JSON 2 Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                      <span>JSON 2: Data Rincian Belanja Sub-Kegiatan</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (data itemized: spek, koefisien, total_harga...)
                    </span>
                  </div>
                  <textarea
                    value={json2Input}
                    onChange={(e) => setJson2Input(e.target.value)}
                    placeholder={`{\n  "status_code": 200,\n  "data": [\n    {\n      "id_rinci_sub_bl": 2315066,\n      "id_subs_sub_bl": 708288,\n      "id_ket_sub_bl": 957927,\n      "spek": "Seminar Kit",\n      "koefisien": "35 Paket",\n      "total_harga": 3500000.0\n    }\n  ]\n}`}
                    rows={9}
                    className="w-full text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons for Merging */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleReset}
                  className="text-slate-600"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Kembalikan ke Data Asli
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleMerge2Json}
                    icon={<Merge className="w-4 h-4" />}
                  >
                    Proses Penggabungan 2 JSON
                  </Button>
                </div>
              </div>

              {/* Merged Preview Card (1 Output Data) */}
              {mergedPreview && (
                <div className="mt-4 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                        1 Output Data Siap
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {mergedPreview.sub_kegiatan.nama_sub_kegiatan}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <CurrencyText
                        amount={mergedPreview.ringkasan.total_pagu}
                        className="text-base font-extrabold text-emerald-800 dark:text-emerald-300"
                      />
                      <Badge variant="success" size="xs">
                        {mergedPreview.ringkasan.total_rincian_item} Item Rincian
                      </Badge>
                    </div>
                  </div>

                  {/* Tampilkan masing-masing Keterangan Sub Belanja */}
                  {mergedPreview.sub_kegiatan.keterangan_list && mergedPreview.sub_kegiatan.keterangan_list.length > 0 && (
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800 space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                        {mergedPreview.sub_kegiatan.keterangan_list.length > 1
                          ? `Terdeteksi ${mergedPreview.sub_kegiatan.keterangan_list.length} Keterangan Sub Belanja (Paket Aktivitas):`
                          : 'Keterangan Sub Belanja:'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mergedPreview.sub_kegiatan.keterangan_list.map((k, idx) => {
                          const matchingCount = mergedPreview.rincian_belanja.filter(
                            (r) => r.id_ket_sub_bl === k.id_ket_sub_bl
                          ).length;
                          const matchingTotal = mergedPreview.rincian_belanja
                            .filter((r) => r.id_ket_sub_bl === k.id_ket_sub_bl)
                            .reduce((acc, c) => acc + (c.total_harga || 0), 0);

                          return (
                            <div
                              key={k.id_ket_sub_bl}
                              className="p-2 rounded-md bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex flex-col justify-between"
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white font-mono text-[10px] font-bold">
                                  ID {k.id_ket_sub_bl}
                                </span>
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {k.ket_bl_teks}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-100 dark:border-emerald-900/40">
                                <span className="text-slate-500">{matchingCount} Item Rincian</span>
                                <CurrencyText amount={matchingTotal} className="font-bold text-emerald-700 dark:text-emerald-300" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Apply button */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('export_unified')}
                      icon={<FileCode className="w-3.5 h-3.5" />}
                    >
                      Lihat Payload JSON 1 Output
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleApplyMergedData}
                      isLoading={isLoading}
                      icon={<Check className="w-4 h-4" />}
                    >
                      Simpan & Terapkan Data Gabungan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT 1 OUTPUT DATA */}
          {activeTab === 'export_unified' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>
                  Payload terpadu (1 Output Data) berisi metadata Sub-Kegiatan, Keterangan Aktivitas, dan seluruh rincian belanja.
                </span>
                <Badge variant="primary" size="xs">
                  {currentItems.length} Rincian Aktif
                </Badge>
              </div>

              <textarea
                readOnly
                value={unifiedOutputString}
                rows={12}
                className="w-full text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJson}
                  icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                >
                  {copied ? 'Tersalin!' : 'Salin 1 Output Data'}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadUnifiedJson}
                  icon={<Download className="w-4 h-4" />}
                >
                  Unduh 1 Berkas JSON
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
