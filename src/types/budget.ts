/**
 * Interface and Types for SIPD E-Budgeting System (Anggaran Sub-Kegiatan Daerah)
 */

export interface KeteranganSubBl {
  id_ket_sub_bl: number;
  id_bl: number;
  id_sub_bl: number;
  id_unik: string;
  tahun: number;
  id_daerah: number;
  id_unit: number;
  ket_bl_teks: string;
  total_pagu?: number;
  rincian_count?: number;
  created_user?: number;
  created_at?: string;
  updated_user?: number;
  updated_at?: string | null;
  id_skpd: number;
  id_sub_skpd: number;
  id_program: number;
  id_giat: number;
  id_sub_giat: number;
  nama_bl?: string | null;
  nama_sub_bl?: string | null;
  nama_daerah: string;
  nama_unit: string;
  nama_skpd: string;
  nama_sub_skpd: string;
  nama_program: string;
  nama_giat: string;
  nama_sub_giat: string;
  kode_daerah?: string | null;
  kode_unit?: string | null;
  kode_skpd?: string | null;
  kode_sub_skpd?: string | null;
  kode_program?: string | null;
  kode_giat?: string | null;
  kode_sub_giat?: string | null;
  id_jadwal?: number | null;
}

export interface RincianBelanjaItem {
  id?: string; // Firestore document ID
  id_rinci_sub_bl: number;
  id_subs_sub_bl: number;
  id_ket_sub_bl: number;
  ket_bl_teks?: string;
  nama_subs_sub_bl?: string;
  id_sub_bl: number;
  tahun: number;
  id_daerah: number;
  id_standar_harga: number;
  kode_standar_harga: string;
  // Baseline Data (Admin / JSON)
  koefisien: string;
  harga_satuan: number;
  total_harga: number;
  base_total_harga?: number;
  base_harga_satuan?: number;
  base_koefisien?: string;
  id_akun: number;
  kode_akun: string;
  nama_akun: string;
  nama_standar_harga: string;
  spek: string;
  akun_locked: string | null;
  ssh_locked: string | null;
  penerima_bantuan: string | null;
  is_pure_otsus: number;
  created_at?: string;
  updated_at?: string;

  // Penyesuaian & Usulan Kolom Baru (Input User Biasa)
  user_spek?: string;
  user_koefisien?: string;
  user_harga_satuan?: number;
  user_total_harga?: number;
  user_catatan?: string;
  user_updated_by?: string;
  user_updated_at?: string;
  is_user_added?: boolean; // true if added by non-admin user
  status_persetujuan?: 'pending' | 'disetujui' | 'ditolak';
}

export interface SubKegiatan {
  id: string; // Document ID / key
  id_sub_bl: number;
  kode_sub_kegiatan: string;
  nama_sub_kegiatan: string;
  id_sub_giat?: number;
  id_giat?: number;
  kode_kegiatan?: string;
  kode_giat?: string | null;
  nama_kegiatan?: string;
  nama_giat?: string;
  nama_sub_giat?: string;
  id_program?: number;
  kode_program?: string | null;
  nama_program?: string;
  id_skpd?: number;
  id_unit?: number;
  kode_skpd?: string;
  nama_skpd?: string;
  nama_unit?: string;
  tahun: number;
  id_daerah: number;
  nama_daerah?: string;
  pagu_indikatif: number;
  pagu_perubahan?: number;
  rincian_count?: number;
  total_rincian?: number;
  status_verifikasi?: 'Draft' | 'Divalidasi' | 'Disetujui' | 'Final';
  keterangan_list?: KeteranganSubBl[];
  pagu_giat?: number | null;
  rinci_giat?: number | null;
  kode_bl?: string | null;
  kode_sbl?: string | null;
  user_created?: string | null;
  user_updated?: string | null;
  created_date?: string | null;
  updated_date?: string | null;
  is_locked?: number | null;
}

export interface SipdApiResponse<T = RincianBelanjaItem[]> {
  status: boolean;
  status_code: number;
  message?: string;
  data: T;
  is_daerah_otsus?: number;
  status_sinkron?: boolean;
}

export type ViewMode = 'summary' | 'detail';
export type GroupingMode = 'keterangan_paket' | 'akun' | 'subs_sub' | 'flat';

export type StandarHargaCategory = 'SSH' | 'HSPK' | 'ASB' | 'SBU';

export interface StandarHargaItem {
  id: string; // unique ID
  id_standar_harga: number;
  kategori: StandarHargaCategory; // 'SSH' | 'HSPK' | 'ASB' | 'SBU'
  kode_standar_harga: string;
  nama_standar_harga: string; // Uraian / Nama barang/jasa
  spek: string; // Spesifikasi
  satuan: string; // Satuan (e.g. Paket, Rim, Orang, Orang/Jam, m2, unit)
  harga_satuan: number;
  kode_akun?: string;
  nama_akun?: string;
  id_akun?: number;
  kelompok_standar_harga?: string; // e.g. "Alat Tulis Kantor", "Honorarium", "Pekerjaan Gedung"
  tipe_dokumen?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}
