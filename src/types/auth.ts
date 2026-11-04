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

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-admin-01',
    username: 'userutama',
    password: 'Kesbang123#',
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
];
