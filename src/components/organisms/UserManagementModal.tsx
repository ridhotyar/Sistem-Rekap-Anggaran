import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  User,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Building,
  Key,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Badge } from '../atoms/Badge';
import { AppUser, UserRole } from '../../types/auth';
import {
  getStoredUsers,
  addNewUser,
  deleteUser,
} from '../../services/authService';

export interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUsersUpdated?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUsersUpdated,
}) => {
  const [users, setUsers] = useState<AppUser[]>(() => getStoredUsers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [bidang, setBidang] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const refreshList = () => {
    const list = getStoredUsers();
    setUsers(list);
    if (onUsersUpdated) onUsersUpdated();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const res = await addNewUser({
      username,
      password,
      nama,
      role,
      bidang,
      jabatan,
    });

    if (res.success && res.user) {
      setSuccess(`Pengguna "${res.user.nama}" (${res.user.username}) berhasil ditambahkan dan tersimpan di Firebase!`);
      setUsername('');
      setPassword('');
      setNama('');
      setBidang('');
      setJabatan('');
      setRole('user');
      setShowAddForm(false);
      refreshList();
    } else {
      setError(res.error || 'Gagal menambahkan pengguna.');
    }
  };

  const handleDelete = async (u: AppUser) => {
    if (u.username === 'admin') {
      setError('Akun Admin utama tidak boleh dihapus.');
      return;
    }
    if (confirm(`Yakin ingin menghapus pengguna "${u.nama}" (${u.username}) dari sistem dan Firebase?`)) {
      const res = await deleteUser(u.id);
      if (res.success) {
        setSuccess(`Pengguna "${u.nama}" telah dihapus.`);
        refreshList();
      } else {
        setError(res.error || 'Gagal menghapus pengguna.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Manajemen Pengguna & Hak Akses Sistem
                </h2>
                <Badge variant="success" size="xs" dot>
                  Firebase Firestore
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data akun dan hak akses tersimpan otomatis di Firebase Firestore (koleksi app_users)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Role explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Level Admin (Hak Penuh)</span>
              </div>
              <ul className="list-disc list-inside text-emerald-800/90 dark:text-emerald-300 space-y-0.5 text-[11px]">
                <li>Input dan import data menggunakan file JSON SIPD</li>
                <li>Menghapus rincian belanja dasar dari JSON</li>
                <li>Menambah, mengedit, dan mengelola akun pengguna</li>
                <li>Menerima atau menyetujui usulan penyesuaian staf</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
              <div className="flex items-center gap-1.5 font-bold text-teal-900 dark:text-teal-200 mb-1">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>Level User Biasa / Staf Operator</span>
              </div>
              <ul className="list-disc list-inside text-teal-800/90 dark:text-teal-300 space-y-0.5 text-[11px]">
                <li>Dapat melakukan edit rincian dan tambah data belanja</li>
                <li>Hasil perubahan tampil di <strong>kolom baru</strong> berdampingan</li>
                <li>Data dasar JSON admin tetap aman dan tidak tertimpa</li>
                <li>Tidak dapat mengimport JSON atau menghapus data base admin</li>
              </ul>
            </div>
          </div>

          {/* Action button to toggle form */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Daftar Pengguna ({users.length})</span>
            </h3>
            <Button
              variant={showAddForm ? 'outline' : 'primary'}
              size="sm"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setError(null);
                setSuccess(null);
              }}
              icon={showAddForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            >
              {showAddForm ? 'Batal Tambah' : 'Tambah Pengguna Baru'}
            </Button>
          </div>

          {/* Add User Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-emerald-300/80 dark:border-emerald-700/80 shadow-md space-y-4 animate-in fade-in duration-150"
            >
              <div className="border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Form Tambah Pengguna Baru
                </span>
                <span className="text-[11px] text-slate-500">Isi lengkap untuk mendaftarkan akun</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: staf_keuangan"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi, S.STP"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Level / Role Hak Akses <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="user">User Biasa / Staf (Penyesuaian & Usulan Kolom Baru)</option>
                    <option value="admin">Admin (Hak Akses Penuh: JSON & Hapus Rincian)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bidang / Unit Kerja
                  </label>
                  <input
                    type="text"
                    value={bidang}
                    onChange={(e) => setBidang(e.target.value)}
                    placeholder="Contoh: Bidang Politik Dalam Negeri"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Contoh: Analis Kebijakan Ahli Muda"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="xs"
                  type="button"
                  onClick={() => setShowAddForm(false)}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  type="submit"
                  icon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  Simpan Pengguna Baru
                </Button>
              </div>
            </form>
          )}

          {/* User Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Pengguna</th>
                  <th className="py-2.5 px-3">Username & Password</th>
                  <th className="py-2.5 px-3">Level / Role</th>
                  <th className="py-2.5 px-3">Bidang / Jabatan</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isAdmin = u.role === 'admin';
                  const isPrimaryAdmin = u.username === 'admin';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        isCurrent ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isAdmin
                                ? 'bg-emerald-600 text-white'
                                : 'bg-teal-600 text-white'
                            }`}
                          >
                            {isAdmin ? (
                              <Shield className="w-3.5 h-3.5" />
                            ) : (
                              <User className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {u.nama}
                              {isCurrent && (
                                <span className="text-[10px] text-emerald-600 font-normal">
                                  (Anda)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              ID: {u.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {u.username}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          pwd: {u.password}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {isAdmin ? (
                          <Badge variant="primary" size="xs">
                            Admin (Akses Penuh)
                          </Badge>
                        ) : (
                          <Badge variant="info" size="xs">
                            User Biasa (Kolom Baru)
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-800 dark:text-slate-200">
                          {u.bidang || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {u.jabatan || '-'}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isPrimaryAdmin ? (
                          <span className="text-[10px] text-slate-400 italic">
                            Admin Utama
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Perubahan data pengguna langsung tersimpan di sistem.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
