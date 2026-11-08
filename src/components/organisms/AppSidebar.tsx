import React from 'react';
import {
  LayoutDashboard,
  Database,
  Layers,
  Upload,
  Users,
  HelpCircle,
  LogOut,
  Landmark,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  RefreshCw,
  FolderTree,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Link, useRouter } from '../../services/router';
import { AppUser } from '../../types/auth';
import { Badge } from '../atoms/Badge';
import type { User } from 'firebase/auth';

export interface AppSidebarProps {
  currentUser?: User | null;
  appUser?: AppUser | null;
  isFirebaseConnected?: boolean;
  onOpenImportExport?: () => void;
  onOpenUserManagement?: () => void;
  onOpenFirebaseGuide?: () => void;
  onLogout?: () => void;
  onRefreshData?: () => void;
  isSyncing?: boolean;
  standarHargaCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentUser,
  appUser,
  isFirebaseConnected,
  onOpenImportExport,
  onOpenUserManagement,
  onOpenFirebaseGuide,
  onLogout,
  onRefreshData,
  isSyncing = false,
  standarHargaCount,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { route, navigate } = useRouter();
  const isAdmin = appUser?.role === 'admin';

  const isDashboardActive =
    route.pathname === '/dashboard' ||
    route.pathname === '/' ||
    route.pathname === '';

  const isStandarHargaActive =
    route.pathname.startsWith('/standar-harga') ||
    route.pathname.startsWith('/ssh');

  const isSubKegiatanDetail = route.pathname.startsWith('/sub-kegiatan');

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 select-none">
      {/* 1. Brand Logo & Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <Link
          to="/dashboard"
          onClick={() => onCloseMobile?.()}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-900/15 shrink-0 group-hover:scale-105 transition-transform">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                SIPD NTB
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                2027
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              Bakesbangpoldagri Prov NTB
            </p>
          </div>
        </Link>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Navigation Menus */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Menu Section */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Menu Utama
          </p>

          {/* Menu Item 1: Dasbor */}
          <Link
            to="/dashboard"
            onClick={() => onCloseMobile?.()}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
              isDashboardActive
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl transition-colors ${
                  isDashboardActive
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-emerald-600'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
              </div>
              <div className="text-left min-w-0">
                <span className="block leading-tight truncate">Dasbor</span>
                <span
                  className={`text-[10px] font-normal block truncate ${
                    isDashboardActive
                      ? 'text-emerald-100'
                      : 'text-slate-400'
                  }`}
                >
                  Anggaran & 6 Program
                </span>
              </div>
            </div>
            {isDashboardActive && <ChevronRight className="w-4 h-4 shrink-0 opacity-80" />}
          </Link>

          {/* Menu Item 2: Standar Harga Satuan (SSH, HSPK, ASB, SBU) */}
          <Link
            to="/standar-harga"
            onClick={() => onCloseMobile?.()}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
              isStandarHargaActive
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl transition-colors ${
                  isStandarHargaActive
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-emerald-600'
                }`}
              >
                <Database className="w-4 h-4 shrink-0" />
              </div>
              <div className="text-left min-w-0">
                <span className="block leading-tight truncate">Standar Harga Satuan</span>
                <span
                  className={`text-[10px] font-normal block truncate ${
                    isStandarHargaActive
                      ? 'text-emerald-100'
                      : 'text-slate-400'
                  }`}
                >
                  SSH • HSPK • ASB • SBU
                </span>
              </div>
            </div>
            {standarHargaCount !== undefined && standarHargaCount > 0 ? (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono shrink-0 ml-1 ${
                  isStandarHargaActive
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold'
                }`}
              >
                {standarHargaCount}
              </span>
            ) : (
              isStandarHargaActive && <ChevronRight className="w-4 h-4 shrink-0 opacity-80" />
            )}
          </Link>

          {/* Contextual Link: If user is on a Sub-Kegiatan detail page */}
          {isSubKegiatanDetail && (
            <div className="pt-2">
              <div className="px-3.5 py-2 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>Detail Sub-Kegiatan</span>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono truncate">
                  ID #{route.params.idSubBl}
                </p>
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    onCloseMobile?.();
                  }}
                  className="mt-2 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  &larr; Kembali ke Daftar Program
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Administration Section (Admin only) */}
        {isAdmin && (
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="px-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Administrasi & Data
            </p>

            {/* Quick Action: Import JSON */}
            {onOpenImportExport && (
              <button
                type="button"
                onClick={() => {
                  onOpenImportExport();
                  onCloseMobile?.();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <Upload className="w-3.5 h-3.5" />
                </div>
                <span>Import JSON SIPD</span>
              </button>
            )}

            {/* Quick Action: User Management */}
            {onOpenUserManagement && (
              <button
                type="button"
                onClick={() => {
                  onOpenUserManagement();
                  onCloseMobile?.();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span>Kelola Pengguna</span>
              </button>
            )}

            {/* Quick Action: Panduan Sinkron */}
            {onOpenFirebaseGuide && (
              <button
                type="button"
                onClick={() => {
                  onOpenFirebaseGuide();
                  onCloseMobile?.();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <span>Panduan Sinkronisasi</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Profile & Session Card */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs ${
                isAdmin ? 'bg-emerald-600' : 'bg-teal-600'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                  {appUser?.nama || 'Pengguna SIPD'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={isAdmin ? 'primary' : 'info'} size="xs" className="text-[9px] py-0 px-1 font-bold">
                  {isAdmin ? 'ADMIN SKPD' : 'OPERATOR'}
                </Badge>
              </div>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Keluar dari Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
