import React from 'react';
import { HeaderNavbar } from '../organisms/HeaderNavbar';
import type { User } from 'firebase/auth';

export interface AppLayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  isFirebaseConnected: boolean;
  onOpenImportExport: () => void;
  onRefreshData?: () => void;
  onOpenFirebaseGuide?: () => void;
  isSyncing?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentUser,
  isFirebaseConnected,
  onOpenImportExport,
  onRefreshData,
  onOpenFirebaseGuide,
  isSyncing,
}) => {
  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Top Navbar */}
      <HeaderNavbar
        currentUser={currentUser}
        isFirebaseConnected={isFirebaseConnected}
        onOpenImportExport={onOpenImportExport}
        onRefreshData={onRefreshData}
        onOpenFirebaseGuide={onOpenFirebaseGuide}
        isSyncing={isSyncing}
      />

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              SIPKD - Sistem Informasi Anggaran & Rincian Sub-Kegiatan
            </span>
            <span>•</span>
            <span>Metode Atomic Design & Firebase Firestore</span>
          </div>
          <div>
            <span>Format Data Standar SIPD Kemendagri RI • Standar Satuan Harga (SSH)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
