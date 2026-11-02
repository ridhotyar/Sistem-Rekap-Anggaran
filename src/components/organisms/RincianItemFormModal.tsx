import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { CurrencyText } from '../atoms/CurrencyText';
import { RincianBelanjaItem } from '../../types/budget';

export interface RincianItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: RincianBelanjaItem) => Promise<void>;
  initialData?: RincianBelanjaItem | null;
  idSubBl: number;
  tahun: number;
  idDaerah: number;
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
];

export const RincianItemFormModal: React.FC<RincianItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  idSubBl,
  tahun,
  idDaerah,
}) => {
  const [formData, setFormData] = useState<Partial<RincianBelanjaItem>>({
    id_sub_bl: idSubBl,
    tahun: tahun,
    id_daerah: idDaerah,
    kode_akun: PRESET_ACCOUNTS[0].kode,
    nama_akun: PRESET_ACCOUNTS[0].nama,
    id_akun: PRESET_ACCOUNTS[0].id_akun,
    kode_standar_harga: '1.1.12.01.03.0001.03113',
    nama_standar_harga: 'Alat Tulis Kantor',
    spek: '',
    koefisien: '1 Paket',
    harga_satuan: 100000,
    total_harga: 100000,
    ssh_locked: '0',
    is_pure_otsus: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id_rinci_sub_bl: Math.floor(2300000 + Math.random() * 90000),
        id_subs_sub_bl: 708290,
        id_ket_sub_bl: 957927,
        id_standar_harga: 4549661,
        id_sub_bl: idSubBl,
        tahun: tahun,
        id_daerah: idDaerah,
        kode_akun: PRESET_ACCOUNTS[0].kode,
        nama_akun: PRESET_ACCOUNTS[0].nama,
        id_akun: PRESET_ACCOUNTS[0].id_akun,
        kode_standar_harga: '1.1.12.01.03.0001.03113',
        nama_standar_harga: 'Alat Tulis Kantor',
        spek: '',
        koefisien: '1 Paket',
        harga_satuan: 50000,
        total_harga: 50000,
        ssh_locked: '0',
        is_pure_otsus: 0,
      });
    }
  }, [initialData, idSubBl, tahun, idDaerah, isOpen]);

  if (!isOpen) return null;

  const handleAccountChange = (kode: string) => {
    const acc = PRESET_ACCOUNTS.find((a) => a.kode === kode);
    if (acc) {
      setFormData((prev) => ({
        ...prev,
        kode_akun: acc.kode,
        nama_akun: acc.nama,
        id_akun: acc.id_akun,
      }));
    }
  };

  const handleKoefisienOrPriceChange = (
    field: 'harga_satuan' | 'total_harga' | 'koefisien',
    val: any
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      // Try to parse simple coefficient number if possible (e.g., "5 Rim" -> 5)
      if (field === 'harga_satuan') {
        const qty = parseFloat(String(prev.koefisien || '1').match(/\d+/)?.[0] || '1');
        updated.total_harga = (Number(val) || 0) * (qty || 1);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.spek?.trim()) {
      setError('Uraian spesifikasi tidak boleh kosong.');
      return;
    }
    if (!formData.total_harga || formData.total_harga <= 0) {
      setError('Total harga harus lebih besar dari 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(formData as RincianBelanjaItem);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan rincian belanja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {initialData ? 'Ubah Rincian Belanja' : 'Tambah Rincian Belanja Baru'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sub-Kegiatan ID: {idSubBl} | Tahun Anggaran {tahun}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Rekening Akun */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Rekening Belanja Daerah (Akun Belanja)
            </label>
            <select
              value={formData.kode_akun}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {PRESET_ACCOUNTS.map((acc) => (
                <option key={acc.kode} value={acc.kode}>
                  {acc.kode} - {acc.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Standar Harga */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Kode Standar Satuan Harga (SSH/ASB)"
              value={formData.kode_standar_harga || ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, kode_standar_harga: e.target.value }))
              }
              placeholder="Contoh: 1.1.12.01.03.0001.03113"
              required
            />
            <Input
              label="Nama Standar Satuan Harga"
              value={formData.nama_standar_harga || ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, nama_standar_harga: e.target.value }))
              }
              placeholder="Contoh: Alat Tulis Kantor"
              required
            />
          </div>

          {/* Spesifikasi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Uraian Spesifikasi Teknis Barang / Jasa
            </label>
            <textarea
              value={formData.spek || ''}
              onChange={(e) => setFormData((p) => ({ ...p, spek: e.target.value }))}
              placeholder="Tuliskan spesifikasi lengkap (contoh: Kertas HVS F4 70gr, Seminar Kit, Paket Rapat Fullday)"
              rows={3}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Koefisien & Harga */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Koefisien / Volume"
              value={formData.koefisien || ''}
              onChange={(e) =>
                handleKoefisienOrPriceChange('koefisien', e.target.value)
              }
              placeholder="Contoh: 35 Paket, 5 Rim"
              required
            />
            <Input
              label="Harga Satuan (Rp)"
              type="number"
              min={0}
              step={100}
              value={formData.harga_satuan || 0}
              onChange={(e) =>
                handleKoefisienOrPriceChange('harga_satuan', Number(e.target.value))
              }
              required
            />
            <Input
              label="Total Harga (Rp)"
              type="number"
              min={0}
              step={100}
              value={formData.total_harga || 0}
              onChange={(e) =>
                setFormData((p) => ({ ...p, total_harga: Number(e.target.value) }))
              }
              required
            />
          </div>

          {/* Preview Calculated Amount */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-500">Kalkulasi Total Belanja:</span>
            <CurrencyText
              amount={formData.total_harga || 0}
              className="text-base text-emerald-700 dark:text-emerald-400 font-bold"
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
              Simpan Rincian
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
