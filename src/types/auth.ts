export type UserRole = 'admin' | 'user';

export interface AppUser {
  id: string;
  username: string;
  password?: string; // Optional legacy field; never exposed in sanitized responses
  passwordHash?: string; // Encrypted/hashed password (SHA-256 + salt)
  salt?: string; // Unique cryptographic salt
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
    passwordHash: 'd67d37b785727d99c54bd77bb6b2e535a3460a5595739a0daf33268ef16c9bdc',
    salt: 'salt_userutama_ntb2027',
    nama: 'Administrator Bakesbangpoldagri',
    role: 'admin',
    bidang: 'Sekretariat / Sub Bagian Perencanaan',
    jabatan: 'Admin Sistem & Perencana Anggaran',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'user-operator-01',
    username: 'operator',
    passwordHash: '055f5648fc0288a9032e67788662ccea37fe0273eed65aefdef5dc283765843d',
    salt: 'salt_operator_ntb2027',
    nama: 'Staf Perencana Wasnas',
    role: 'user',
    bidang: 'Bidang Kewaspadaan Nasional & Penanganan Konflik',
    jabatan: 'Operator Pengusul Rincian Belanja',
    createdAt: '2026-01-02T09:00:00.000Z',
  },
];
