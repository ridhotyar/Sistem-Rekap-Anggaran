import React from 'react';
import { Landmark, Calendar, RefreshCw, Upload, Download, Sparkles } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { UserAuthButton } from '../molecules/UserAuthButton';
import type { User } from 'firebase/auth';

export interface HeaderNavbarProps {
  currentUser: User | null;
  isFirebaseConnected: boolean;
  onOpenImportExport: () => void;
  onRefreshData?: () => void;
  isSyncing?: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentUser,
  isFirebaseConnected,
  onOpenImportExport,
  onRefreshData,
  isSyncing = false,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-900/10 shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  SIPKD-SIPD
                </span>
                <Badge variant="primary" size="xs">
                  E-Anggaran
                </Badge>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 font-medium">
                Sistem Informasi Pengelolaan Anggaran & Rincian Sub-Kegiatan Daerah
              </p>
            </div>
          </div>

          {/* Right Actions & Meta */}
          <div className="flex items-center gap-2.5">
            {/* Fiscal Year indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>TA 2027</span>
            </div>

            {/* Refresh / Sync */}
            {onRefreshData && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onRefreshData}
                disabled={isSyncing}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
                title="Sinkronisasi data"
              >
                <span className="hidden md:inline">Sinkron</span>
              </Button>
            )}

            {/* Import / Export JSON */}
            <Button
              variant="outline"
              size="xs"
              onClick={onOpenImportExport}
              icon={<Upload className="w-3.5 h-3.5 text-slate-500" />}
              className="border-slate-300"
            >
              <span className="hidden sm:inline">Import/Export JSON</span>
              <span className="sm:hidden">JSON</span>
            </Button>

            {/* Auth / Account */}
            <UserAuthButton
              currentUser={currentUser}
              isFirebaseConnected={isFirebaseConnected}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
