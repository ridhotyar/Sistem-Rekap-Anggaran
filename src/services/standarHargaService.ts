import * as XLSX from 'xlsx';
import { StandarHargaItem, StandarHargaCategory } from '../types/budget';
import { INITIAL_STANDAR_HARGA_LIST } from '../data/initialStandarHargaData';

export const LOCAL_STORAGE_KEY_STANDAR_HARGA = 'sipd_standar_harga_v1';

/**
 * Mendapatkan daftar standar harga dari localStorage atau data awal
 */
export function getStoredStandarHarga(): StandarHargaItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_STANDAR_HARGA);
    if (raw) {
      const parsed = JSON.parse(raw) as StandarHargaItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Gagal membaca standar harga dari localStorage:', e);
  }
  return INITIAL_STANDAR_HARGA_LIST;
}

/**
 * Menyimpan daftar standar harga ke localStorage
 */
export function saveStoredStandarHarga(items: StandarHargaItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_STANDAR_HARGA, JSON.stringify(items));
  } catch (e) {
    console.error('Gagal menyimpan standar harga ke localStorage:', e);
  }
}

/**
 * Reset standar harga ke data bawaan resmi
 */
export function resetStandarHargaToDefault(): StandarHargaItem[] {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_STANDAR_HARGA);
  } catch (e) {
    console.warn(e);
  }
  return INITIAL_STANDAR_HARGA_LIST;
}

export interface ExcelImportResult {
  success: boolean;
  importedItems: StandarHargaItem[];
  totalParsed: number;
  totalSkipped: number;
  errors: string[];
}

/**
 * Membersihkan dan mengenali kategori standar harga
 */
function normalizeCategory(rawCategory?: string, sheetName?: string): StandarHargaCategory {
  const target = (rawCategory || sheetName || '').trim().toUpperCase();
  if (target.includes('HSPK')) return 'HSPK';
  if (target.includes('ASB')) return 'ASB';
  if (target.includes('SBU')) return 'SBU';
  return 'SSH';
}

/**
 * Mencari nilai pada row berdasarkan berbagai kemungkinan variasi nama kolom Excel
 */
function findValue(row: Record<string, any>, possibleKeys: string[]): any {
  const rowKeys = Object.keys(row);
  for (const key of possibleKeys) {
    const matched = rowKeys.find(
      (rk) => rk.trim().toLowerCase().replace(/[\s_.-]+/g, '') === key.trim().toLowerCase().replace(/[\s_.-]+/g, '')
    );
    if (matched && row[matched] !== undefined && row[matched] !== null && String(row[matched]).trim() !== '') {
      return row[matched];
    }
  }
  return undefined;
}

/**
 * Mengimpor dan mem-parsing file Excel (.xlsx / .xls) menjadi StandarHargaItem[]
 */
export async function parseExcelFile(
  file: File,
  forcedCategory?: StandarHargaCategory
): Promise<ExcelImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const importedItems: StandarHargaItem[] = [];
        const errors: string[] = [];
        let totalSkipped = 0;

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) return;

          const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
            defval: '',
            raw: false,
          });

          jsonRows.forEach((row, idx) => {
            const rawNama = findValue(row, [
              'nama_standar_harga',
              'nama',
              'uraian',
              'nama_barang',
              'uraian_barang',
              'barang',
              'deskripsi',
              'item',
            ]);

            const rawHarga = findValue(row, [
              'harga_satuan',
              'harga',
              'tarif',
              'pagu',
              'pagu_satuan',
              'nominal',
              'nilai',
            ]);

            // Jika baris kosong atau tidak memiliki nama item, lewati
            if (!rawNama || String(rawNama).trim() === '') {
              totalSkipped += 1;
              return;
            }

            // Parse harga angka
            let hargaNum = 0;
            if (typeof rawHarga === 'number') {
              hargaNum = rawHarga;
            } else if (typeof rawHarga === 'string') {
              const cleaned = rawHarga.replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
              hargaNum = parseFloat(cleaned) || 0;
            }

            const rawKode = findValue(row, [
              'kode_standar_harga',
              'kode',
              'kode_ssh',
              'kode_barang',
              'id_standar_harga',
            ]);

            const rawSpek = findValue(row, [
              'spek',
              'spesifikasi',
              'spesifikasi_teknis',
              'deskripsi_spek',
              'keterangan',
            ]);

            const rawSatuan = findValue(row, [
              'satuan',
              'satuan_ukur',
              'unit',
              'satuan_standar',
            ]);

            const rawKategori = findValue(row, [
              'kategori',
              'tipe',
              'jenis',
              'kelompok',
              'tipe_standar_harga',
            ]);

            const rawKodeAkun = findValue(row, [
              'kode_akun',
              'kode_rekening',
              'rekening',
              'akun',
            ]);

            const rawNamaAkun = findValue(row, [
              'nama_akun',
              'nama_rekening',
              'uraian_akun',
            ]);

            const rawKelompok = findValue(row, [
              'kelompok_standar_harga',
              'kelompok_barang',
              'sub_kelompok',
            ]);

            const detectedKategori = forcedCategory || normalizeCategory(String(rawKategori), sheetName);
            const itemIdNum = Math.floor(4000000 + Math.random() * 900000);
            const codeStr = rawKode
              ? String(rawKode).trim()
              : `${detectedKategori}.${itemIdNum.toString().slice(0, 4)}.${Math.floor(Math.random() * 9000)}`;

            const newItem: StandarHargaItem = {
              id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              id_standar_harga: itemIdNum,
              kategori: detectedKategori,
              kode_standar_harga: codeStr,
              nama_standar_harga: String(rawNama).trim(),
              spek: rawSpek ? String(rawSpek).trim() : String(rawNama).trim(),
              satuan: rawSatuan ? String(rawSatuan).trim() : 'Paket',
              harga_satuan: hargaNum,
              kode_akun: rawKodeAkun ? String(rawKodeAkun).trim() : undefined,
              nama_akun: rawNamaAkun ? String(rawNamaAkun).trim() : undefined,
              kelompok_standar_harga: rawKelompok ? String(rawKelompok).trim() : undefined,
              tipe_dokumen: `Import Excel (${sheetName})`,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            importedItems.push(newItem);
          });
        });

        resolve({
          success: importedItems.length > 0,
          importedItems,
          totalParsed: importedItems.length,
          totalSkipped,
          errors,
        });
      } catch (err: any) {
        resolve({
          success: false,
          importedItems: [],
          totalParsed: 0,
          totalSkipped: 0,
          errors: [err?.message || 'Gagal membaca format file Excel.'],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        importedItems: [],
        totalParsed: 0,
        totalSkipped: 0,
        errors: ['Terjadi kesalahan saat membaca file dari peramban.'],
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Mengekspor database standar harga ke format file Excel (.xlsx)
 */
export function exportStandarHargaToExcel(
  items: StandarHargaItem[],
  fileName = 'Database_Standar_Harga_Satuan_NTB_2027.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  // Helper formatting for export
  const formatRows = (list: StandarHargaItem[]) =>
    list.map((it, idx) => ({
      No: idx + 1,
      Kategori: it.kategori,
      'Kode Standar Harga': it.kode_standar_harga,
      'Nama Standar Harga / Uraian': it.nama_standar_harga,
      Spesifikasi: it.spek,
      Satuan: it.satuan,
      'Harga Satuan (Rp)': it.harga_satuan,
      'Kode Rekening Belanja': it.kode_akun || '',
      'Nama Rekening Belanja': it.nama_akun || '',
      Kelompok: it.kelompok_standar_harga || '',
    }));

  // 1. Sheet Semua Item
  const wsAll = XLSX.utils.json_to_sheet(formatRows(items));
  XLSX.utils.book_append_sheet(wb, wsAll, 'Semua Data');

  // 2. Sheet per Kategori (SSH, HSPK, ASB, SBU)
  const categories: StandarHargaCategory[] = ['SSH', 'HSPK', 'ASB', 'SBU'];
  categories.forEach((cat) => {
    const catItems = items.filter((i) => i.kategori === cat);
    if (catItems.length > 0) {
      const wsCat = XLSX.utils.json_to_sheet(formatRows(catItems));
      XLSX.utils.book_append_sheet(wb, wsCat, cat);
    }
  });

  XLSX.writeFile(wb, fileName);
}

/**
 * Mengunduh file template Excel resmi untuk Standar Harga Satuan
 */
export function downloadStandarHargaTemplate(): void {
  const wb = XLSX.utils.book_new();

  const sampleRowsSSH = [
    {
      Kategori: 'SSH',
      'Kode Standar Harga': '1.1.12.01.03.0001.03113',
      'Nama Standar Harga / Uraian': 'Kertas HVS (F4) 70 gr',
      Spesifikasi: 'Kertas HVS ukuran 33 x 21.5 cm 70 gr warna putih (Sinar Dunia)',
      Satuan: 'Rim',
      'Harga Satuan': 60000,
      'Kode Rekening Belanja': '5.1.02.01.001.00025',
      'Nama Rekening Belanja': 'Belanja Alat/Bahan untuk Kegiatan Kantor- Kertas dan Cover',
      Kelompok: 'Kertas dan Cover',
    },
    {
      Kategori: 'SSH',
      'Kode Standar Harga': '1.1.12.01.03.0001.03115',
      'Nama Standar Harga / Uraian': 'Seminar Kit Lengkap',
      Spesifikasi: 'Tas Spunbond 75gsm + Blocknote A5 + Bolpoin gel + Name tag',
      Satuan: 'Paket',
      'Harga Satuan': 100000,
      'Kode Rekening Belanja': '5.1.02.01.001.00024',
      'Nama Rekening Belanja': 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
      Kelompok: 'Alat Tulis Kantor',
    },
  ];

  const sampleRowsHSPK = [
    {
      Kategori: 'HSPK',
      'Kode Standar Harga': '2.1.01.01.02.0001.00012',
      'Nama Standar Harga / Uraian': 'Pengecatan Tembok Gedung Interior',
      Spesifikasi: 'Pengecatan 1 lapis plamir, 1 lapis cat dasar, 2 lapis cat penutup interior',
      Satuan: 'M2',
      'Harga Satuan': 38500,
      'Kode Rekening Belanja': '5.1.02.03.001.00001',
      'Nama Rekening Belanja': 'Belanja Pemeliharaan Bangunan Gedung-Bangunan Gedung Tempat Kerja',
      Kelompok: 'Pemeliharaan Gedung',
    },
  ];

  const sampleRowsASB = [
    {
      Kategori: 'ASB',
      'Kode Standar Harga': '3.1.01.01.01.0001.00001',
      'Nama Standar Harga / Uraian': 'Paket Rapat Koordinasi Penyusunan Kebijakan (Fullday)',
      Spesifikasi: 'Paket rapat luar kantor Eselon II (1x makan, 2x snack, meeting room)',
      Satuan: 'Orang',
      'Harga Satuan': 713000,
      'Kode Rekening Belanja': '5.1.02.04.001.00004',
      'Nama Rekening Belanja': 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota',
      Kelompok: 'Paket Rapat dan Pertemuan',
    },
  ];

  const sampleRowsSBU = [
    {
      Kategori: 'SBU',
      'Kode Standar Harga': '8.1.02.02.01.0003.00006',
      'Nama Standar Harga / Uraian': 'Honorarium Narasumber Pejabat Eselon II / Setara',
      Spesifikasi: 'Honorarium narasumber pimpinan tinggi pratama / akademisi / pakar',
      Satuan: 'Orang / Jam',
      'Harga Satuan': 1000000,
      'Kode Rekening Belanja': '5.1.02.02.001.00003',
      'Nama Rekening Belanja': 'Honorarium Narasumber atau Pembahas, Moderator, Pembawa Acara, dan Panitia',
      Kelompok: 'Honorarium',
    },
  ];

  const wsSSH = XLSX.utils.json_to_sheet(sampleRowsSSH);
  const wsHSPK = XLSX.utils.json_to_sheet(sampleRowsHSPK);
  const wsASB = XLSX.utils.json_to_sheet(sampleRowsASB);
  const wsSBU = XLSX.utils.json_to_sheet(sampleRowsSBU);

  XLSX.utils.book_append_sheet(wb, wsSSH, 'SSH');
  XLSX.utils.book_append_sheet(wb, wsHSPK, 'HSPK');
  XLSX.utils.book_append_sheet(wb, wsASB, 'ASB');
  XLSX.utils.book_append_sheet(wb, wsSBU, 'SBU');

  XLSX.writeFile(wb, 'Template_Standar_Harga_Satuan_SSH_HSPK_ASB_SBU.xlsx');
}
