import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  X,
  AlertCircle,
  Wifi,
  WifiOff,
  Activity,
  Layers,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import {
  forceSyncLocalToFirestore,
  checkFirestoreConnectionStatus,
} from '../../services/firebase';
import { SubKegiatan, RincianBelanjaItem } from '../../types/budget';
import { getStoredUsers } from '../../services/authService';

export interface FirebaseSyncGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirebaseConnected: boolean;
  subKegiatans: SubKegiatan[];
  rincianItems: RincianBelanjaItem[];
  onSyncComplete?: () => void;
}

export const FirebaseSyncGuideModal: React.FC<FirebaseSyncGuideModalProps> = ({
  isOpen,
  onClose,
  isFirebaseConnected,
  subKegiatans,
  rincianItems,
  onSyncComplete,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveConnected, setLiveConnected] = useState<boolean>(isFirebaseConnected);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setLiveConnected(isFirebaseConnected);
      setSyncStatus(null);
      if (!isFirebaseConnected) {
        setFailureReason('Koneksi belum tersambung ke basis data Firestore.');
      } else {
        setFailureReason(null);
      }
    }
  }, [isOpen, isFirebaseConnected]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    try {
      setIsChecking(true);
      setSyncStatus(null);
      const res = await checkFirestoreConnectionStatus();
      setLiveConnected(res.connected);
      if (!res.connected) {
        setFailureReason(res.reason || 'Koneksi ke basis data terputus atau gagal terhubung.');
      } else {
        setFailureReason(null);
      }
    } catch (err) {
      setLiveConnected(false);
      setFailureReason(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memeriksa koneksi ke server.'
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleForceSync = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus(null);
      const res = await forceSyncLocalToFirestore(subKegiatans, rincianItems, getStoredUsers());
      setSyncStatus(res);
      if (res.success) {
        setLiveConnected(true);
        setFailureReason(null);
        onSyncComplete?.();
      } else {
        setFailureReason(res.message);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal melakukan sinkronisasi data.';
      setSyncStatus({ success: false, message: msg });
      setFailureReason(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-50 via-emerald-50/40 to-slate-50 dark:from-slate-850 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl text-white shadow-sm shrink-0 transition-colors ${
                liveConnected ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Status Koneksi Firebase
                </h3>
                <Badge variant={liveConnected ? 'success' : 'danger'} size="xs" dot>
                  {liveConnected ? 'Berhasil Terhubung' : 'Gagal Terhubung'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring status integrasi basis data cloud Firestore
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Main Status Banner */}
          {liveConnected ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Status: Berhasil Terhubung
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-1 leading-relaxed">
                    Aplikasi berhasil terhubung secara penuh dengan basis data Firestore. Data anggaran, sub-kegiatan, dan rincian belanja aktif tersinkronisasi secara real-time.
                  </p>
                </div>
              </div>

              {/* Status details without exposing sensitive keys */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 text-xs">
                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/50">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    Status Layanan
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Online & Normal
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/50">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    Sinkronisasi Real-time
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    Aktif Terhubung
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                    Status: Gagal Terhubung ke Firebase
                  </h4>
                  <p className="text-xs text-rose-800 dark:text-rose-300/90 leading-relaxed">
                    Sistem tidak dapat berkomunikasi dengan basis data cloud Firebase saat ini.
                  </p>
                </div>
              </div>

              {/* Reason for failure */}
              <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-800/70 space-y-1">
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block uppercase tracking-wide">
                  Penyebab Kegagalan:
                </span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {failureReason || 'Koneksi internet bermasalah atau server basis data tidak dapat dijangkau.'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-rose-700 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-900/30 p-2 rounded-lg">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>
                  Aplikasi otomatis beralih ke <b>Penyimpanan Lokal Sementara</b>. Data Anda tetap tersimpan dengan aman di browser.
                </span>
              </div>
            </div>
          )}

          {/* Sync status alert if any */}
          {syncStatus && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                syncStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              {syncStatus.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span className="font-medium leading-relaxed">{syncStatus.message}</span>
            </div>
          )}

          {/* Data Summary & Diagnostic Controls */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-4 h-4 text-slate-500" />
                Jumlah Data Tersimpan:
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {subKegiatans.length} Sub-Kegiatan • {rincianItems.length} Rincian
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="outline"
                size="xs"
                onClick={handleTestConnection}
                isLoading={isChecking}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />}
                className="w-full sm:w-auto text-xs"
              >
                Uji Koneksi Ulang
              </Button>

              <Button
                variant="primary"
                size="xs"
                onClick={handleForceSync}
                isLoading={isSyncing}
                icon={<Cloud className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto text-xs ml-auto"
              >
                Sinkronkan Data Sekarang
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            Keamanan data terjamin tanpa mengekspos informasi sensitif.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
