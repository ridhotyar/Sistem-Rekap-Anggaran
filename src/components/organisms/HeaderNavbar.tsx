import React from 'react';
import {
  Landmark,
  Calendar,
  RefreshCw,
  Upload,
  Users,
  LogOut,
  Shield,
  UserCheck,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { AppUser } from '../../types/auth';
import { Link } from '../../services/router';
import type { User } from 'firebase/auth';

export interface HeaderNavbarProps {
  currentUser?: User | null;
  appUser?: AppUser | null;
  isFirebaseConnected: boolean;
  onOpenImportExport: () => void;
  onOpenUserManagement?: () => void;
  onLogout?: () => void;
  onRefreshData?: () => void;
  onOpenFirebaseGuide?: () => void;
  isSyncing?: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentUser,
  appUser,
  isFirebaseConnected,
  onOpenImportExport,
  onOpenUserManagement,
  onLogout,
  onRefreshData,
  onOpenFirebaseGuide,
  isSyncing = false,
}) => {
  const isAdmin = appUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand linking to /dashboard */}
          <Link
            to="/dashboard"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            title="Ke Dashboard Utama"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-900/10 shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  SIPKD-SIPD
                </span>
                <Badge variant="primary" size="xs">
                  NTB 2027
                </Badge>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 font-medium">
                Bakesbangpoldagri Provinsi Nusa Tenggara Barat
              </p>
            </div>
          </Link>

          {/* Right Actions & User info */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Fiscal Year */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
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
                <span className="hidden sm:inline">Sinkron</span>
              </Button>
            )}

            {/* Import / Export JSON - ONLY FOR ADMIN */}
            {isAdmin ? (
              <Button
                variant="outline"
                size="xs"
                onClick={onOpenImportExport}
                icon={<Upload className="w-3.5 h-3.5 text-emerald-600" />}
                className="border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 font-semibold"
                title="Import data SIPD melalui JSON (Khusus Admin)"
              >
                <span className="hidden sm:inline">Import JSON SIPD</span>
                <span className="sm:hidden">JSON</span>
              </Button>
            ) : null}

            {/* User Management Button - ONLY FOR ADMIN */}
            {isAdmin && onOpenUserManagement && (
              <Button
                variant="outline"
                size="xs"
                onClick={onOpenUserManagement}
                icon={<Users className="w-3.5 h-3.5 text-slate-600" />}
                title="Kelola Pengguna Sistem"
              >
                <span className="hidden md:inline">Kelola User</span>
              </Button>
            )}

            {/* User Profile & Role Badge */}
            {appUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isAdmin
                      ? 'bg-emerald-600 text-white'
                      : 'bg-teal-600 text-white'
                  }`}
                  title={appUser.nama}
                >
                  {isAdmin ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                </div>

                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-xs font-bold text-slate-900 dark:text-white max-w-[120px] truncate">
                      {appUser.nama.split(' ')[0]}
                    </span>
                    <Badge
                      variant={isAdmin ? 'primary' : 'info'}
                      size="xs"
                      className="text-[9px] py-0 px-1 font-bold"
                    >
                      {isAdmin ? 'ADMIN' : 'USER BIASA'}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    @{appUser.username}
                  </span>
                </div>

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1 cursor-pointer"
                    title="Keluar dari sistem"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
