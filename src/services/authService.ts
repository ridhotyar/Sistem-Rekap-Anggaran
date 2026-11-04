import { AppUser, DEFAULT_USERS } from '../types/auth';
import { saveAppUser, removeAppUser, authenticateUserFromFirestore } from './firebase';
import { hashPassword, verifyPassword } from './cryptoService';

const STORAGE_KEY_USERS = 'sipd_users_v2';
const STORAGE_KEY_SESSION = 'sipd_current_session_user';

export { DEFAULT_USERS };

/**
 * Strips password, passwordHash, and salt from user object before returning to client/session
 */
export const sanitizeUser = (user: AppUser): AppUser => {
  return {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    bidang: user.bidang,
    jabatan: user.jabatan,
    createdAt: user.createdAt,
  };
};

export const getStoredUsers = (): AppUser[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw) as AppUser[];
    // Ensure default admin always exists
    const hasAdmin = parsed.some(
      (u) => u.username === DEFAULT_USERS[0].username || u.role === 'admin'
    );
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
    const parsed = JSON.parse(raw) as AppUser;
    return sanitizeUser(parsed);
  } catch {
    return null;
  }
};

/**
 * Authenticates user credentials.
 * Hits Firestore specifically for this single username on login button click,
 * and verifies against encrypted SHA-256 hash.
 */
export const loginWithCredentials = async (
  username: string,
  passwordAttempt: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> => {
  const trimmedUser = username.trim().toLowerCase();
  if (!trimmedUser || !passwordAttempt) {
    return {
      success: false,
      error: 'Username dan password tidak boleh kosong.',
    };
  }

  // 1. Hit Firestore specifically for this username
  try {
    const firestoreUser = await authenticateUserFromFirestore(trimmedUser, passwordAttempt);
    if (firestoreUser) {
      const safe = sanitizeUser(firestoreUser);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(safe));
      return {
        success: true,
        user: safe,
      };
    }
  } catch (err) {
    console.warn('Remote auth check deferred to local credentials:', err);
  }

  // 2. Check local users with passwordHash verification
  const users = getStoredUsers();
  const matched = users.find((u) => u.username.toLowerCase() === trimmedUser);

  if (matched) {
    let isValid = false;

    if (matched.passwordHash && matched.salt) {
      isValid = await verifyPassword(passwordAttempt, matched.passwordHash, matched.salt);
    } else if (matched.password && matched.password === passwordAttempt) {
      isValid = true;
      // Upgrade local record to hash
      const { hash, salt } = await hashPassword(passwordAttempt);
      matched.passwordHash = hash;
      matched.salt = salt;
      delete matched.password;
      saveUsers(users);
    }

    if (isValid) {
      const safe = sanitizeUser(matched);
      try {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(safe));
      } catch (e) {
        console.warn('Failed to set session', e);
      }
      return {
        success: true,
        user: safe,
      };
    }
  }

  return {
    success: false,
    error: 'Username atau password tidak cocok. Silakan periksa kembali atau gunakan akun yang terdaftar.',
  };
};

export const logoutAppUser = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  } catch (e) {
    console.warn('Failed to clear session', e);
  }
};

export const addNewUser = async (
  userData: {
    username: string;
    password?: string;
    nama: string;
    role: AppUser['role'];
    bidang: string;
    jabatan?: string;
  }
): Promise<{ success: boolean; user?: AppUser; error?: string }> => {
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

  // Generate SHA-256 hash and unique salt
  const { hash, salt } = await hashPassword(userData.password);

  const newUser: AppUser = {
    id: `user-${Date.now()}`,
    username: cleanUsername,
    passwordHash: hash,
    salt,
    nama: userData.nama.trim(),
    role: userData.role,
    bidang: userData.bidang.trim() || 'Bakesbangpoldagri NTB',
    jabatan:
      userData.jabatan?.trim() ||
      (userData.role === 'admin' ? 'Administrator' : 'Staf Operator'),
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  saveUsers(updatedUsers);

  // Synchronize to Firebase Firestore without plaintext password
  try {
    await saveAppUser(newUser);
  } catch (err) {
    console.warn('Failed to sync new user to Firestore immediately:', err);
  }

  return { success: true, user: sanitizeUser(newUser) };
};

export const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const users = getStoredUsers();
  const target = users.find((u) => u.id === userId);

  if (!target) {
    return { success: false, error: 'Pengguna tidak ditemukan.' };
  }
  if (target.username === DEFAULT_USERS[0].username) {
    return { success: false, error: 'Akun Administrator utama tidak dapat dihapus.' };
  }

  const filtered = users.filter((u) => u.id !== userId);
  saveUsers(filtered);

  // If current logged-in user is deleted, clear session
  const current = getCurrentAuthUser();
  if (current?.id === userId) {
    logoutAppUser();
  }

  // Remove from Firebase Firestore
  try {
    await removeAppUser(userId);
  } catch (err) {
    console.warn('Failed to remove user from Firestore immediately:', err);
  }

  return { success: true };
};
