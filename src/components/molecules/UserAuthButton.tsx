import React from 'react';
import { LogIn, LogOut, ShieldCheck, Database } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { loginWithGoogle, logout } from '../../services/firebase';
import type { User } from 'firebase/auth';

export interface UserAuthButtonProps {
  currentUser: User | null;
  isFirebaseConnected: boolean;
}

export const UserAuthButton: React.FC<UserAuthButtonProps> = ({
  currentUser,
  isFirebaseConnected,
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
    } catch (err) {
      console.error('Google Sign-in failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
    } catch (err) {
      console.error('Sign-out failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Firebase status badge */}
      <div className="hidden md:flex items-center">
        <Badge
          variant={isFirebaseConnected ? 'success' : 'neutral'}
          size="xs"
          dot
          className="font-normal"
        >
          <Database className="w-3 h-3 mr-0.5 inline" />
          {isFirebaseConnected ? 'Firebase Aktif' : 'Penyimpanan Lokal'}
        </Badge>
      </div>

      {currentUser ? (
        <div className="flex items-center gap-2">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'User'}
              className="w-7 h-7 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold">
              {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="hidden lg:inline text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
            {currentUser.displayName || currentUser.email}
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleLogout}
            isLoading={loading}
            icon={<LogOut className="w-3.5 h-3.5" />}
            title="Keluar"
          >
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="xs"
          onClick={handleLogin}
          isLoading={loading}
          icon={<LogIn className="w-3.5 h-3.5 text-emerald-600" />}
          className="border-slate-300"
        >
          <span className="hidden sm:inline">Masuk Google</span>
        </Button>
      )}
    </div>
  );
};
