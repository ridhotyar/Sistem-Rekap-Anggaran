import React from 'react';
import { AlertTriangle, Trash2, X, Building2, Layers, Coins, Calendar } from 'lucide-react';
import { Button } from '../atoms/Button';
import { CurrencyText } from '../atoms/CurrencyText';
import { SubKegiatan } from '../../types/budget';

export interface ConfirmDeleteSubKegiatanModalProps {
  isOpen: boolean;
  onClose: () => void;
  subKegiatan: SubKegiatan | null;
  onConfirm: (subKegiatan: SubKegiatan) => Promise<void> | void;
  isDeleting?: boolean;
}

export const ConfirmDeleteSubKegiatanModal: React.FC<ConfirmDeleteSubKegiatanModalProps> = ({
  isOpen,
  onClose,
  subKegiatan,
  onConfirm,
  isDeleting = false,
}) => {
  if (!isOpen || !subKegiatan) return null;

  const totalPagu = subKegiatan.total_rincian || subKegiatan.pagu_indikatif || 0;
  const itemCount = subKegiatan.rincian_count || 0;
  const paketCount = subKegiatan.keterangan_list?.length || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-950/60 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 bg-rose-50/80 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/50 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                Hapus Sub-Kegiatan Anggaran?
              </h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-400 mt-0.5">
                Konfirmasi penghapusan data sub-kegiatan dan seluruh rincian belanja.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Apakah Anda yakin ingin menghapus sub-kegiatan berikut dari sistem anggaran? Tindakan ini akan menghapus data sub-kegiatan beserta seluruh rincian belanja terkait.
          </p>

          {/* Sub-Kegiatan Detail Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {subKegiatan.kode_sub_kegiatan}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: {subKegiatan.id_sub_bl}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {subKegiatan.nama_sub_kegiatan}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{subKegiatan.nama_skpd || 'Bakesbangpoldagri NTB'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Tahun {subKegiatan.tahun}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span><strong>{paketCount}</strong> Paket ({itemCount} item rincian)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Coins className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  <CurrencyText amount={totalPagu} />
                </span>
              </div>
            </div>
          </div>

          {/* Warning Note */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Perhatian:</strong> Data yang telah dihapus tidak dapat dipulihkan secara otomatis kecuali Anda melakukan import ulang dari file JSON sumber.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={isDeleting}
            onClick={() => onConfirm(subKegiatan)}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Ya, Hapus Sub-Kegiatan
          </Button>
        </div>
      </div>
    </div>
  );
};
