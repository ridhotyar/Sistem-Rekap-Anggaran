export type UserRole = 'admin' | 'user';

export interface AppUser {
  id: string;
  username: string;
  password: string;
  nama: string;
  role: UserRole;
  bidang: string;
  jabatan?: string;
  createdAt?: string;
}

export interface AuthSession {
  user: AppUser | null;
  isAuthenticated: boolean;
}
