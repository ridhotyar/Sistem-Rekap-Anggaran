import React, { useState } from 'react';
import {
  KeyRound,
  User as UserIcon,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Lock,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { AppUser } from '../../types/auth';
import { loginWithCredentials } from '../../services/authService';

export interface LoginPageProps {
  onLoginSuccess: (user: AppUser) => void;
  currentUser?: AppUser | null;
  onGoToDashboard?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  currentUser,
  onGoToDashboard,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Silakan masukkan username dan password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Hit authentication API specifically on login button click
      const res = await loginWithCredentials(username, password);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Login gagal.');
      }
    } catch (err) {
      setIsLoading(false);
      setError('Terjadi kendala saat memverifikasi kredensial. Silakan coba kembali.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10 space-y-6">
        {/* Title Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/20 mb-2 border border-emerald-400/30">
            <Building2 className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug drop-shadow-xs">
            Sistem Informasi Perencanaan dan Penganggaran Bakesbangpoldagri Provinsi NTB
          </h1>

          <p className="text-xs sm:text-sm text-emerald-200/80 font-medium max-w-md mx-auto">
            Portal Akses E-Budgeting & Rincian Belanja Sub-Kegiatan Daerah APBD TA 2027
          </p>
        </div>

        {/* If user is already logged in */}
        {currentUser && onGoToDashboard && (
          <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 text-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                  Sesi Aktif
                </p>
                <p className="text-sm font-bold text-white">
                  {currentUser.nama} ({currentUser.role === 'admin' ? 'Admin' : 'User Biasa'})
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={onGoToDashboard}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shrink-0 shadow-md"
            >
              Masuk ke Dashboard
            </Button>
          </div>
        )}

        {/* Login Form Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Autentikasi Pengguna
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              SIPD TA 2027
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  autoComplete="username"
                  required
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
                  className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  autoComplete="current-password"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              isLoading={isLoading}
              icon={<LogIn className="w-4 h-4" />}
              className="w-full justify-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold shadow-lg shadow-emerald-700/20 py-3 rounded-xl mt-2 cursor-pointer"
            >
              Masuk ke Sistem
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400/80">
          Badan Kesatuan Bangsa dan Politik Dalam Negeri Provinsi Nusa Tenggara Barat &copy; 2026/2027
        </p>
      </div>
    </div>
  );
};
