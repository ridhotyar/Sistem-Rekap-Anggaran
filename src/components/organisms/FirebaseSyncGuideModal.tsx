import React, { useState } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  X,
  Server,
  HelpCircle,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { firebaseConfig, forceSyncLocalToFirestore, testFirestoreConnection } from '../../services/firebase';
import { SubKegiatan, RincianBelanjaItem } from '../../types/budget';

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
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const envVariablesText = `VITE_FIREBASE_API_KEY=${firebaseConfig.apiKey}
VITE_FIREBASE_AUTH_DOMAIN=${firebaseConfig.authDomain}
VITE_FIREBASE_PROJECT_ID=${firebaseConfig.projectId}
VITE_FIREBASE_STORAGE_BUCKET=${firebaseConfig.storageBucket}
VITE_FIREBASE_MESSAGING_SENDER_ID=${firebaseConfig.messagingSenderId}
VITE_FIREBASE_APP_ID=${firebaseConfig.appId}
VITE_FIREBASE_DATABASE_ID=${firebaseConfig.firestoreDatabaseId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envVariablesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleForceSync = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      const res = await forceSyncLocalToFirestore(subKegiatans, rincianItems);
      setIsSuccess(res.success);
      setSyncMessage(res.message);
      if (res.success) {
        onSyncComplete?.();
      }
    } catch (e) {
      setIsSuccess(false);
      setSyncMessage(e instanceof Error ? e.message : 'Gagal sinkronisasi');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/60 dark:from-slate-800 dark:to-slate-850 border-b border-emerald-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Koneksi Firebase & Panduan Rilis Vercel
                </h3>
                <Badge variant={isFirebaseConnected ? 'success' : 'warning'} size="xs" dot>
                  {isFirebaseConnected ? 'Terhubung Firestore' : 'Penyimpanan Lokal'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cara menyambungkan data Firebase agar sinkron antara AI Studio, GitHub, dan Vercel.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs text-slate-700 dark:text-slate-300">
          {/* Status Panel */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Detail Database Firebase Anda
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Firebase Project ID:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{firebaseConfig.projectId}</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Firestore Database ID:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 truncate block">
                  {firebaseConfig.firestoreDatabaseId}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Data aktif lokal: <b>{subKegiatans.length}</b> Sub-Kegiatan, <b>{rincianItems.length}</b> Rincian Belanja
              </span>
              <Button
                variant="primary"
                size="xs"
                onClick={handleForceSync}
                isLoading={isSyncing}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Upload & Sinkronkan Data ke Firestore Sekarang
              </Button>
            </div>

            {syncMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  isSuccess
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{syncMessage}</span>
              </div>
            )}
          </div>

          {/* Mengapa data di Vercel tidak tertampil? */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              Mengapa Data Belum Muncul di Vercel?
            </h4>
            <div className="space-y-2 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              <p>
                Ada 3 penyebab utama mengapa aplikasi di Vercel belum menampilkan data dari Firebase:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>
                  <b>File Konfigurasi tidak ikut ter-upload</b>: File <code className="font-mono text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.5 rounded">firebase-applet-config.json</code> berada di root folder. Jika file ini tidak ter-push ke GitHub, Vercel membutuhkan <b>Environment Variables</b>.
                </li>
                <li>
                  <b>Named Database ID</b>: Database Firestore ini dibuat dengan nama khusus <code className="font-mono text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.5 rounded">{firebaseConfig.firestoreDatabaseId}</code> (bukan default). Tanpa parameter ini, Vercel akan membaca database default yang kosong.
                </li>
                <li>
                  <b>Authorized Domains di Firebase Console</b>: Firebase Authentication membutuhkan domain Vercel Anda diizinkan di daftar Authorized Domains.
                </li>
              </ol>
            </div>
          </div>

          {/* Langkah Sinkronisasi ke Vercel */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-600" />
              Langkah Menghubungkan ke Vercel (Hanya 2 Menit):
            </h4>

            <div className="space-y-2.5">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white text-[11px]">
                    1. Salin Environment Variables di bawah ini:
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleCopy}
                    icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied ? 'Tersalin ke Clipboard!' : 'Salin Semua Variabel'}
                  </Button>
                </div>

                <pre className="p-2.5 rounded-lg bg-slate-950 text-emerald-400 text-[10px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {envVariablesText}
                </pre>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 text-[11px]">
                <span className="font-semibold text-slate-900 dark:text-white block">
                  2. Pasang di Dashboard Vercel:
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Buka <b>Vercel Dashboard</b> &gt; Pilih proyek Anda &gt; <b>Settings</b> &gt; <b>Environment Variables</b>.
                  Paste seluruh variabel di atas ke kolom input (Vercel otomatis memisahkan Key dan Value-nya).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 text-[11px]">
                <span className="font-semibold text-slate-900 dark:text-white block">
                  3. Lakukan Redeploy di Vercel:
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Masuk ke tab <b>Deployments</b> di Vercel, klik tombol titik tiga (⋯) pada deployment terakhir lalu pilih <b>Redeploy</b> agar variabel lingkungan baru langsung aktif.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 text-[11px]">
                <span className="font-semibold text-slate-900 dark:text-white block">
                  4. Tambahkan Domain Vercel ke Firebase (Untuk Login Google):
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Buka{' '}
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    Firebase Console <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  &gt; Proyek <b>{firebaseConfig.projectId}</b> &gt; <b>Authentication</b> &gt; <b>Settings</b> &gt; <b>Authorized Domains</b> &gt; Tambahkan domain Anda (contoh: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">proyek-anda.vercel.app</code>).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Setelah variabel dipasang, data di AI Studio dan Vercel akan otomatis saling terhubung dan tersinkronisasi secara real-time.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
