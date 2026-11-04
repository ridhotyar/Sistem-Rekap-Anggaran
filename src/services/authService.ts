import { AppUser } from '../types/auth';

const STORAGE_KEY_USERS = 'sipd_users_v2';
const STORAGE_KEY_SESSION = 'sipd_current_session_user';

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-admin-01',
    username: 'admin',
    password: 'admin123',
    nama: 'Administrator Bakesbangpoldagri',
    role: 'admin',
    bidang: 'Sekretariat / Sub Bagian Perencanaan',
    jabatan: 'Admin Sistem & Perencana Anggaran',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'user-operator-01',
    username: 'operator',
    password: 'operator123',
    nama: 'Staf Perencana Wasnas',
    role: 'user',
    bidang: 'Bidang Kewaspadaan Nasional & Penanganan Konflik',
    jabatan: 'Operator Pengusul Rincian Belanja',
    createdAt: '2026-01-02T09:00:00.000Z',
  },
  {
    id: 'user-poldagri-01',
    username: 'staf_poldagri',
    password: 'poldagri123',
    nama: 'Staf Politik Dalam Negeri',
    role: 'user',
    bidang: 'Bidang Politik Dalam Negeri & Ormas',
    jabatan: 'Operator Pengusul Rincian Belanja',
    createdAt: '2026-01-03T10:00:00.000Z',
  },
];

export const getStoredUsers = (): AppUser[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw) as AppUser[];
    // Ensure default admin always exists
    const hasAdmin = parsed.some((u) => u.username === 'admin');
    if (!hasAdmin) {
      const merged = [DEFAULT_USERS[0], ...parsed];
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return DEFAULT_USERS;
  }
};

export const saveUsers = (users: AppUser[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to save users to localStorage', e);
  }
};

export const getCurrentAuthUser = (): AppUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
};

export const loginWithCredentials = (
  username: string,
  password: string
): { success: boolean; user?: AppUser; error?: string } => {
  const users = getStoredUsers();
  const trimmedUser = username.trim().toLowerCase();
  const matched = users.find(
    (u) => u.username.toLowerCase() === trimmedUser && u.password === password
  );

  if (!matched) {
    return {
      success: false,
      error: 'Username atau password tidak cocok. Silakan periksa kembali atau gunakan kredensial yang tersedia.',
    };
  }

  try {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(matched));
  } catch (e) {
    console.warn('Failed to set session', e);
  }

  return {
    success: true,
    user: matched,
  };
};

export const logoutAppUser = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  } catch (e) {
    console.warn('Failed to clear session', e);
  }
};

export const addNewUser = (
  userData: Omit<AppUser, 'id' | 'createdAt'>
): { success: boolean; user?: AppUser; error?: string } => {
  const users = getStoredUsers();
  const cleanUsername = userData.username.trim().toLowerCase();

  if (!cleanUsername) {
    return { success: false, error: 'Username tidak boleh kosong.' };
  }
  if (!userData.password || userData.password.length < 4) {
    return { success: false, error: 'Password minimal 4 karakter.' };
  }
  if (!userData.nama.trim()) {
    return { success: false, error: 'Nama pengguna tidak boleh kosong.' };
  }

  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: `Username "${cleanUsername}" sudah digunakan.` };
  }

  const newUser: AppUser = {
    id: `user-${Date.now()}`,
    username: cleanUsername,
    password: userData.password,
    nama: userData.nama.trim(),
    role: userData.role,
    bidang: userData.bidang.trim() || 'Bakesbangpoldagri NTB',
    jabatan: userData.jabatan?.trim() || (userData.role === 'admin' ? 'Administrator' : 'Staf Operator'),
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  saveUsers(updatedUsers);

  return { success: true, user: newUser };
};

export const deleteUser = (userId: string): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  const target = users.find((u) => u.id === userId);

  if (!target) {
    return { success: false, error: 'Pengguna tidak ditemukan.' };
  }
  if (target.username === 'admin') {
    return { success: false, error: 'Akun Administrator utama tidak dapat dihapus.' };
  }

  const filtered = users.filter((u) => u.id !== userId);
  saveUsers(filtered);

  // If current logged-in user is deleted, clear session
  const current = getCurrentAuthUser();
  if (current?.id === userId) {
    logoutAppUser();
  }

  return { success: true };
};
