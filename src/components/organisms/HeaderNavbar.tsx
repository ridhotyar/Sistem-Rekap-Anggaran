import React, { useState, useRef, useEffect } from 'react';
import {
  Landmark,
  Calendar,
  LogOut,
  Shield,
  Building,
  Menu,
} from 'lucide-react';
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
  onOpenMobileMenu?: () => void;
  isSyncing?: boolean;
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentUser,
  appUser,
  isFirebaseConnected,
  onOpenImportExport,
  onOpenUserManagement,
  onLogout,
  onRefreshData,
  onOpenFirebaseGuide,
  onOpenMobileMenu,
  isSyncing = false,
}) => {
  const isAdmin = appUser?.role === 'admin';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close user menu popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Mobile hamburger & breadcrumb / brand */}
          <div className="flex items-center gap-3">
            {onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Buka Menu Navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Mobile-only logo */}
            <Link
              to="/dashboard"
              className="lg:hidden flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                SIPD NTB
              </span>
            </Link>

          </div>

          {/* Right Actions & User info */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Fiscal Year */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>TA 2027</span>
            </div>

            {/* User Profile Avatar with Click-to-Open Details Dropdown */}
            {appUser && (
              <div
                ref={userMenuRef}
                className="relative pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800"
              >
                {/* Avatar Button Trigger (Hanya Avatar) */}
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className={`p-0.5 rounded-full transition-all cursor-pointer select-none focus:outline-none ${
                    isUserMenuOpen
                      ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900 scale-105'
                      : 'hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700 hover:scale-105'
                  }`}
                  title={`Profil Pengguna: ${appUser.nama} (@${appUser.username})`}
                  aria-expanded={isUserMenuOpen}
                >
                  {/* Avatar Circle with Initials and Online Dot */}
                  <div className="relative">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white shadow-md ${
                        isAdmin
                          ? 'bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-500 shadow-emerald-900/25'
                          : 'bg-gradient-to-tr from-blue-700 via-cyan-600 to-blue-500 shadow-blue-900/25'
                      }`}
                    >
                      {getInitials(appUser.nama)}
                    </div>
                    {/* Status indicator dot */}
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                      title="Online"
                    />
                  </div>
                </button>

                {/* Popover Card: Tampil informasi yang ada di div saat avatar di-klik */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Profile Header */}
                    <div className="p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 ${
                            isAdmin
                              ? 'bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-500'
                              : 'bg-gradient-to-tr from-blue-700 via-cyan-600 to-blue-500'
                          }`}
                        >
                          {getInitials(appUser.nama)}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {appUser.nama}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            @{appUser.username}
                          </p>
                          <div className="pt-0.5">
                            <Badge
                              variant={isAdmin ? 'primary' : 'info'}
                              size="xs"
                              className="font-bold uppercase tracking-wider text-[10px]"
                            >
                              {isAdmin ? 'ADMINISTRATOR' : 'USER BIASA'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Bakesbangpoldagri Provinsi NTB</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                          <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {isAdmin
                              ? 'Hak Akses Penuh Anggaran & Master Data'
                              : 'Hak Akses Usulan Rincian Belanja'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Popover Actions List */}
                    {onLogout && (
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Keluar dari Sistem</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
