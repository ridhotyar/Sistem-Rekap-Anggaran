import * as XLSX from 'xlsx';
import { StandarHargaItem, StandarHargaCategory } from '../types/budget';
import { INITIAL_STANDAR_HARGA_LIST } from '../data/initialStandarHargaData';

export const LOCAL_STORAGE_KEY_STANDAR_HARGA = 'sipd_standar_harga_v1';

// ============================================================================
// INDEXEDDB ENGINE - Untuk Menyimpan Ribuan Standar Harga Tanpa Batasan Kuota 5MB LocalStorage
// ============================================================================
const IDB_NAME = 'SIPD_StandarHarga_DB';
const IDB_VERSION = 1;
const IDB_STORE = 'standar_harga_items';

function openStandarHargaIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn('Gagal membuka IndexedDB standar harga:', req.error);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Menyimpan seluruh daftar standar harga ke IndexedDB (Mendukung puluhan ribu baris)
 */
export async function saveStandarHargaToIDB(items: StandarHargaItem[]): Promise<boolean> {
  const db = await openStandarHargaIDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => {
        inMemoryItemsCache = items;
        resolve(true);
      };
      tx.onerror = (e) => {
        console.warn('Gagal commit transaksi IndexedDB:', e);
        resolve(false);
      };
    } catch (e) {
      console.warn('Error saveStandarHargaToIDB:', e);
      resolve(false);
    }
  });
}

/**
 * Memuat daftar standar harga dari IndexedDB
 */
export async function loadStandarHargaFromIDB(): Promise<StandarHargaItem[] | null> {
  const db = await openStandarHargaIDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        if (Array.isArray(req.result) && req.result.length > 0) {
          inMemoryItemsCache = req.result as StandarHargaItem[];
          resolve(req.result as StandarHargaItem[]);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ============================================================================
// LAZY LOADING & ON-DEMAND PAGINATED QUERY ENGINE
// ============================================================================

export interface StandarHargaQueryParams {
  page: number; // 1-indexed (e.g. 1)
  pageSize: number; // e.g. 15
  category?: StandarHargaCategory | 'ALL';
  searchQuery?: string;
}

export interface StandarHargaPageResult {
  items: StandarHargaItem[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  categoryCounts: {
    ALL: number;
    SSH: number;
    HSPK: number;
    ASB: number;
    SBU: number;
  };
}

let inMemoryItemsCache: StandarHargaItem[] | null = null;

export function invalidateStandarHargaCache(): void {
  inMemoryItemsCache = null;
}

export async function getLoadedStandarHargaList(): Promise<StandarHargaItem[]> {
  if (inMemoryItemsCache && inMemoryItemsCache.length > 0) {
    return inMemoryItemsCache;
  }
  const idbItems = await loadStandarHargaFromIDB();
  if (idbItems && idbItems.length > 0) {
    inMemoryItemsCache = idbItems;
    return idbItems;
  }
  const localItems = getStoredStandarHarga();
  inMemoryItemsCache = localItems;
  return localItems;
}

/**
 * Lazy Load Database Query:
 * Mengambil HANYA sekumpulan N data (misal 15 data) sesuai yang dibutuhkan oleh front-end.
 * Database tidak mengirimkan semua data sekaligus, melainkan hanya 15 data yang tampil pada layar.
 */
export async function fetchStandarHargaPage(
  params: StandarHargaQueryParams
): Promise<StandarHargaPageResult> {
  const { page = 1, pageSize = 15, category = 'ALL', searchQuery = '' } = params;

  // 1. Ambil data dari basis data (IndexedDB / cache terisi)
  const all = await getLoadedStandarHargaList();

  // 2. Hitung jumlah total per kategori
  const categoryCounts = {
    ALL: all.length,
    SSH: 0,
    HSPK: 0,
    ASB: 0,
    SBU: 0,
  };
  for (let i = 0; i < all.length; i++) {
    const it = all[i];
    if (categoryCounts[it.kategori] !== undefined) {
      categoryCounts[it.kategori]++;
    }
  }

  // 3. Filter berdasarkan kategori dan kata kunci pencarian
  const q = (searchQuery || '').trim().toLowerCase();
  const filtered = all.filter((it) => {
    if (category !== 'ALL' && it.kategori !== category) {
      return false;
    }
    if (!q) return true;
    return (
      (it.nama_standar_harga && it.nama_standar_harga.toLowerCase().includes(q)) ||
      (it.spek && it.spek.toLowerCase().includes(q)) ||
      (it.kode_standar_harga && it.kode_standar_harga.toLowerCase().includes(q)) ||
      (it.satuan && it.satuan.toLowerCase().includes(q)) ||
      (it.kode_akun && it.kode_akun.toLowerCase().includes(q)) ||
      (it.nama_akun && it.nama_akun.toLowerCase().includes(q)) ||
      (it.kelompok_standar_harga && it.kelompok_standar_harga.toLowerCase().includes(q))
    );
  });

  const totalItems = filtered.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // 4. Potong HANYA jumlah data yang tampil di front end (misal 15 data)
  const offset = (safePage - 1) * safePageSize;
  const pageItems = filtered.slice(offset, offset + safePageSize);

  return {
    items: pageItems,
    totalItems,
    totalPages,
    currentPage: safePage,
    pageSize: safePageSize,
    categoryCounts,
  };
}

/**
 * Menyimpan satu item standar harga (tambah baru atau update)
 */
export async function saveSingleStandarHarga(item: StandarHargaItem): Promise<StandarHargaItem[]> {
  const current = await getLoadedStandarHargaList();
  const key = getStandarHargaItemKey(item);
  const idx = current.findIndex((i) => getStandarHargaItemKey(i) === key || i.id === item.id);

  let updated: StandarHargaItem[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...item, updated_at: new Date().toISOString() };
  } else {
    updated = [item, ...current];
  }

  inMemoryItemsCache = updated;
  saveStoredStandarHarga(updated);
  return updated;
}

/**
 * Menghapus satu item standar harga
 */
export async function deleteSingleStandarHarga(itemId: string): Promise<StandarHargaItem[]> {
  const current = await getLoadedStandarHargaList();
  const updated = current.filter((i) => i.id !== itemId);
  inMemoryItemsCache = updated;
  saveStoredStandarHarga(updated);
  return updated;
}

/**
 * Menghasilkan kunci identitas unik untuk sebuah item standar harga.
 * CATATAN PENTING:
 * Di SIPD, kode_standar_harga (kode rekening barang) sering dipakai bersama
 * oleh ratusan barang berbeda (contoh: 1.1.12.01.01.0001.00001 dipakai oleh Abu Batu, AC-BC, dll).
 * JANGAN PERNAH menyatukan/deduplikasi hanya berdasarkan kode_standar_harga!
 */
export function getStandarHargaItemKey(item: StandarHargaItem): string {
  if (item.id_standar_harga && Number(item.id_standar_harga) > 0) {
    return `id_${item.id_standar_harga}`;
  }
  const cat = (item.kategori || 'SSH').trim().toUpperCase();
  const kode = (item.kode_standar_harga || '').trim().toLowerCase();
  const nama = (item.nama_standar_harga || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const spek = (item.spek || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${cat}__${kode}__${nama}__${spek}`;
}

/**
 * Menggabungkan atau memperbarui list standar harga tanpa kehilangan ribuan baris data
 */
export function mergeStandarHargaLists(
  existingList: StandarHargaItem[],
  newItems: StandarHargaItem[],
  targetCategory?: StandarHargaCategory | 'AUTO',
  mode: 'merge' | 'replace' = 'merge'
): StandarHargaItem[] {
  if (mode === 'replace') {
    if (targetCategory && targetCategory !== 'AUTO') {
      // Ganti hanya kategori yang dipilih (misal: hanya SSH), pertahankan kategori lain (HSPK, ASB, SBU)
      const otherCategories = existingList.filter((item) => item.kategori !== targetCategory);
      return [...newItems, ...otherCategories];
    }
    // Ganti total seluruh database
    return newItems;
  }

  // Mode MERGE:
  const map = new Map<string, StandarHargaItem>();
  // 1. Masukkan data yang sudah ada ke map
  existingList.forEach((item) => {
    map.set(getStandarHargaItemKey(item), item);
  });
  // 2. Masukkan / perbarui dengan data baru dari file Excel
  newItems.forEach((newItem) => {
    map.set(getStandarHargaItemKey(newItem), newItem);
  });

  return Array.from(map.values());
}

/**
 * Mendapatkan daftar standar harga dari localStorage atau data awal (sinkron)
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
 * Menyimpan daftar standar harga ke localStorage dan IndexedDB
 */
export function saveStoredStandarHarga(items: StandarHargaItem[]): void {
  inMemoryItemsCache = items;
  // 1. Simpan ke IndexedDB untuk kapasitas besar (ribuan data)
  saveStandarHargaToIDB(items).catch((err) => console.warn('IDB save error:', err));

  // 2. Coba simpan ke localStorage sebagai cache cepat
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_STANDAR_HARGA, JSON.stringify(items));
  } catch (e) {
    console.warn('LocalStorage kuota terlampaui (data besar tersimpan aman di IndexedDB):', e);
  }
}

/**
 * Reset standar harga ke data bawaan resmi
 */
export function resetStandarHargaToDefault(): StandarHargaItem[] {
  inMemoryItemsCache = INITIAL_STANDAR_HARGA_LIST;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_STANDAR_HARGA);
    saveStandarHargaToIDB(INITIAL_STANDAR_HARGA_LIST).catch(() => {});
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

        let globalRowCounter = 0;

        workbook.SheetNames.forEach((sheetName, sheetIdx) => {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) return;

          // Cek apakah baris pertama adalah judul/banner dan cari baris header kolom sebenarnya
          const rawGrid = XLSX.utils.sheet_to_json<any[]>(worksheet, {
            header: 1,
            defval: '',
            blankrows: false,
          });

          if (!rawGrid || rawGrid.length === 0) return;

          let headerRowIdx = 0;
          for (let r = 0; r < Math.min(10, rawGrid.length); r++) {
            const rowArr = rawGrid[r];
            if (Array.isArray(rowArr)) {
              const rowStr = rowArr.join(' ').toLowerCase();
              if (
                (rowStr.includes('kode') && rowStr.includes('barang')) ||
                (rowStr.includes('uraian') && rowStr.includes('barang')) ||
                (rowStr.includes('harga') && rowStr.includes('satuan')) ||
                rowStr.includes('spesifikasi') ||
                rowStr.includes('standar harga') ||
                rowStr.includes('rekening')
              ) {
                headerRowIdx = r;
                break;
              }
            }
          }

          const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
            range: headerRowIdx,
            defval: '',
            raw: false,
          });

          jsonRows.forEach((row, idx) => {
            globalRowCounter += 1;

            // 1. Uraian Kelompok & Kode Kelompok
            const rawKodeKelompok = findValue(row, [
              'kode_kelompok_barang',
              'kode_kelompok',
              'kode_rek_kelompok',
            ]);

            const rawUraianKelompok = findValue(row, [
              'uraian_kelompok_barang',
              'kelompok_barang',
              'kelompok_standar_harga',
              'kelompok',
              'uraian_kelompok',
            ]);

            // 2. ID Standar Harga (Primary key resmi SIPD)
            const rawIdStandarHarga = findValue(row, [
              'id_standar_harga',
              'id_standar',
              'id_barang',
              'id_ssh',
              'id_hspk',
              'id_asb',
              'id_sbu',
              'id',
            ]);

            // 3. Kode Barang / Kode Standar Harga (Prioritaskan KODE BARANG sebelum kelompok)
            const rawKode =
              findValue(row, [
                'kode_barang',
                'kode_standar_harga',
                'kode_ssh',
                'kode_hspk',
                'kode_asb',
                'kode_sbu',
                'kode',
              ]) ||
              findValue(row, ['kode_kelompok_barang', 'kode_kelompok']);

            // 4. Uraian Barang / Nama Standar Harga
            const rawNama = findValue(row, [
              'uraian_barang',
              'nama_barang',
              'nama_standar_harga',
              'nama',
              'uraian',
              'barang',
              'item',
              'pekerjaan',
              'uraian_pekerjaan',
              'komponen',
            ]);

            // 5. Spesifikasi
            const rawSpek = findValue(row, [
              'spesifikasi',
              'spek',
              'spesifikasi_teknis',
              'deskripsi_spek',
              'deskripsi',
              'keterangan',
            ]);

            // 6. Satuan
            const rawSatuan = findValue(row, [
              'satuan',
              'satuan_standar',
              'satuan_ukur',
              'unit',
            ]);

            // 7. Harga Satuan
            const rawHarga = findValue(row, [
              'harga_satuan',
              'harga',
              'tarif',
              'pagu',
              'pagu_satuan',
              'nominal',
              'nilai',
            ]);

            // 8. Kode Rekening & Nama Rekening Belanja
            const rawKodeAkun = findValue(row, [
              'kode_rekening',
              'kode_akun',
              'rekening',
              'akun',
              'kode_rek',
            ]);

            const rawNamaAkun = findValue(row, [
              'nama_akun',
              'nama_rekening',
              'uraian_rekening',
              'uraian_akun',
            ]);

            const rawKategori = findValue(row, [
              'kategori',
              'tipe',
              'jenis',
              'tipe_standar_harga',
            ]);

            // Baris kosong tanpa nama atau spesifikasi
            if ((!rawNama || String(rawNama).trim() === '') && (!rawSpek || String(rawSpek).trim() === '')) {
              totalSkipped += 1;
              return;
            }

            // Parse harga angka dengan aman (mendukung format Rupiah Rp 348.400,00 / 1513600 / dll)
            let hargaNum = 0;
            if (typeof rawHarga === 'number') {
              hargaNum = rawHarga;
            } else if (typeof rawHarga === 'string') {
              let clean = rawHarga.replace(/Rp\.?/gi, '').trim();
              if (clean.includes(',') && clean.includes('.')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
              } else if (clean.includes(',')) {
                if (/,\d{1,2}$/.test(clean)) {
                  clean = clean.replace(',', '.');
                } else {
                  clean = clean.replace(/,/g, '');
                }
              } else if (clean.includes('.')) {
                if (/\.\d{3}/.test(clean)) {
                  clean = clean.replace(/\./g, '');
                }
              }
              hargaNum = parseFloat(clean) || 0;
            }

            // Menentukan Nama Barang & Spesifikasi
            let finalNama = '';
            let finalSpek = '';

            const strNama = rawNama ? String(rawNama).trim() : '';
            const strSpek = rawSpek ? String(rawSpek).trim() : '';
            const strKelompok = rawUraianKelompok ? String(rawUraianKelompok).trim() : '';

            if (strSpek && strNama) {
              if (strKelompok && strNama.toLowerCase() === strKelompok.toLowerCase()) {
                finalNama = strSpek;
                finalSpek = `${strNama} (${strSpek})`;
              } else {
                finalNama = strNama;
                finalSpek = strSpek;
              }
            } else if (strNama) {
              finalNama = strNama;
              finalSpek = strNama;
            } else if (strSpek) {
              finalNama = strSpek;
              finalSpek = strSpek;
            }

            const detectedKategori = forcedCategory || normalizeCategory(String(rawKategori), sheetName);

            // Parsing ID Standar Harga (Primary key resmi)
            let itemIdNum = 0;
            if (rawIdStandarHarga) {
              const parsedId = parseInt(String(rawIdStandarHarga).replace(/[^\d]/g, ''), 10);
              if (!isNaN(parsedId) && parsedId > 0) {
                itemIdNum = parsedId;
              }
            }
            if (itemIdNum === 0) {
              itemIdNum = 4000000 + globalRowCounter * 10 + (idx % 10);
            }

            const codeStr = rawKode
              ? String(rawKode).trim()
              : `${detectedKategori}.${itemIdNum.toString().slice(0, 4)}.${globalRowCounter}`;

            const newItem: StandarHargaItem = {
              id: `sh-${Date.now()}-${sheetIdx}-${idx}-${itemIdNum}`,
              id_standar_harga: itemIdNum,
              kategori: detectedKategori,
              kode_standar_harga: codeStr,
              nama_standar_harga: finalNama,
              spek: finalSpek,
              satuan: rawSatuan ? String(rawSatuan).trim() : 'Paket',
              harga_satuan: hargaNum,
              kode_akun: rawKodeAkun ? String(rawKodeAkun).trim() : undefined,
              nama_akun: rawNamaAkun ? String(rawNamaAkun).trim() : undefined,
              kelompok_standar_harga: rawUraianKelompok ? String(rawUraianKelompok).trim() : undefined,
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
 * Sesuai dengan format baku SIPD (KODE KELOMPOK BARANG, URAIAN KELOMPOK BARANG, ID STANDAR HARGA, KODE BARANG, URAIAN BARANG, SPESIFIKASI, SATUAN, HARGA SATUAN, KODE REKENING)
 */
export function downloadStandarHargaTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Template SSH (Standar Satuan Harga)
  const sampleRowsSSH = [
    {
      'KODE KELOMPOK BARANG': '1.1.12.01.03.0001',
      'URAIAN KELOMPOK BARANG': 'Alat Tulis Kantor',
      'ID STANDAR HARGA': 4778094,
      'KODE BARANG': '1.1.12.01.03.0001.03113',
      'URAIAN BARANG': 'Kertas dan Cover',
      SPESIFIKASI: 'Kertas HVS (F4) 70 gr Sinar Dunia',
      SATUAN: 'Rim',
      'HARGA SATUAN': 60000,
      'KODE REKENING': '5.1.02.01.001.00025',
    },
    {
      'KODE KELOMPOK BARANG': '1.1.12.01.03.0001',
      'URAIAN KELOMPOK BARANG': 'Alat Tulis Kantor',
      'ID STANDAR HARGA': 4778096,
      'KODE BARANG': '1.1.12.01.03.0001.03115',
      'URAIAN BARANG': 'Alat Tulis Kantor',
      SPESIFIKASI: 'Seminar Kit Lengkap (Tas + Blocknote + Bolpoin + Id Card)',
      SATUAN: 'Paket',
      'HARGA SATUAN': 100000,
      'KODE REKENING': '5.1.02.01.001.00024',
    },
    {
      'KODE KELOMPOK BARANG': '1.1.12.01.03.0003',
      'URAIAN KELOMPOK BARANG': 'Bahan Cetak',
      'ID STANDAR HARGA': 4549661,
      'KODE BARANG': '1.1.12.01.03.0003.01249',
      'URAIAN BARANG': 'Bahan Cetak',
      SPESIFIKASI: 'Fotocopy bahan HVS 70 gr pulau lombok 1 muka',
      SATUAN: 'Lembar',
      'HARGA SATUAN': 300,
      'KODE REKENING': '5.1.02.01.001.00026',
    },
  ];

  // Template HSPK (Harga Satuan Pokok Kegiatan) - Sesuai persis dengan data screenshot pengguna
  const sampleRowsHSPK = [
    {
      'KODE KELOMPOK BARANG': '1.1.12.01.01.0001',
      'URAIAN KELOMPOK BARANG': 'Bahan Bangunan dan Konstruksi',
      'ID STANDAR HARGA': 4555928,
      'KODE BARANG': '1.1.12.01.01.0001.00001',
      'URAIAN BARANG': 'Bahan Bangunan dan Konstruksi',
      SPESIFIKASI: 'Abu Batu',
      SATUAN: 'M3',
      'HARGA SATUAN': 348400,
      'KODE REKENING': '5.1.02.01.001.00001',
    },
    {
      'KODE KELOMPOK BARANG': '1.1.12.01.01.0001',
      'URAIAN KELOMPOK BARANG': 'Bahan Bangunan dan Konstruksi',
      'ID STANDAR HARGA': 4555929,
      'KODE BARANG': '1.1.12.01.01.0001.00002',
      'URAIAN BARANG': 'Bahan Bangunan dan Konstruksi',
      SPESIFIKASI: 'AC-BC',
      SATUAN: 'Ton',
      'HARGA SATUAN': 1513600,
      'KODE REKENING': '5.1.02.01.001.00001',
    },
    {
      'KODE KELOMPOK BARANG': '1.1.12.01.01.0001',
      'URAIAN KELOMPOK BARANG': 'Bahan Bangunan dan Konstruksi',
      'ID STANDAR HARGA': 4555930,
      'KODE BARANG': '1.1.12.01.01.0001.00003',
      'URAIAN BARANG': 'Bahan Bangunan dan Konstruksi',
      SPESIFIKASI: 'ACP Coating PE (Indoor)',
      SATUAN: 'Lembar',
      'HARGA SATUAN': 810900,
      'KODE REKENING': '5.1.02.01.001.00001',
    },
    {
      'KODE KELOMPOK BARANG': '1.1.12.01.01.0001',
      'URAIAN KELOMPOK BARANG': 'Bahan Bangunan dan Konstruksi',
      'ID STANDAR HARGA': 4555931,
      'KODE BARANG': '1.1.12.01.01.0001.00004',
      'URAIAN BARANG': 'Bahan Bangunan dan Konstruksi',
      SPESIFIKASI: 'ACP Coating PVDF (Outdoor)',
      SATUAN: 'Lembar',
      'HARGA SATUAN': 961000,
      'KODE REKENING': '5.1.02.01.001.00001',
    },
    {
      'KODE KELOMPOK BARANG': '1.1.12.01.01.0001',
      'URAIAN KELOMPOK BARANG': 'Bahan Bangunan dan Konstruksi',
      'ID STANDAR HARGA': 4555932,
      'KODE BARANG': '1.1.12.01.01.0001.00005',
      'URAIAN BARANG': 'Bahan Bangunan dan Konstruksi',
      SPESIFIKASI: 'AC-WC',
      SATUAN: 'Ton',
      'HARGA SATUAN': 1717800,
      'KODE REKENING': '5.1.02.01.001.00001',
    },
  ];

  // Template ASB (Analisis Standar Belanja)
  const sampleRowsASB = [
    {
      'KODE KELOMPOK BARANG': '3.1.01.01.01.0001',
      'URAIAN KELOMPOK BARANG': 'Paket Rapat dan Pertemuan',
      'ID STANDAR HARGA': 4589397,
      'KODE BARANG': '8.1.02.04.01.0004.00006',
      'URAIAN BARANG': 'Paket Rapat Luar Kantor',
      SPESIFIKASI: 'Paket Kegiatan Rapat Luar Kantor Setingkat Eselon II (Fullday Meeting)',
      SATUAN: 'Orang',
      'HARGA SATUAN': 713000,
      'KODE REKENING': '5.1.02.04.001.00004',
    },
    {
      'KODE KELOMPOK BARANG': '3.1.01.01.01.0002',
      'URAIAN KELOMPOK BARANG': 'Penyelenggaraan Sosialisasi',
      'ID STANDAR HARGA': 4589400,
      'KODE BARANG': '8.1.02.04.01.0004.00010',
      'URAIAN BARANG': 'Paket Sosialisasi Wawasan Kebangsaan',
      SPESIFIKASI: 'Paket Sosialisasi Terpadu 100 Orang (Konsumsi, Bahan Materi, Sertifikat)',
      SATUAN: 'Kegiatan',
      'HARGA SATUAN': 25000000,
      'KODE REKENING': '5.1.02.04.001.00004',
    },
  ];

  // Template SBU (Standar Biaya Umum)
  const sampleRowsSBU = [
    {
      'KODE KELOMPOK BARANG': '8.1.02.02.01.0003',
      'URAIAN KELOMPOK BARANG': 'Honorarium',
      'ID STANDAR HARGA': 4587243,
      'KODE BARANG': '8.1.02.02.01.0003.00005',
      'URAIAN BARANG': 'Honorarium Narasumber',
      SPESIFIKASI: 'Narasumber Pejabat Eselon II / Akademisi / Pakar Terakreditasi',
      SATUAN: 'Orang / Jam',
      'HARGA SATUAN': 1000000,
      'KODE REKENING': '5.1.02.02.001.00003',
    },
    {
      'KODE KELOMPOK BARANG': '8.1.02.02.01.0003',
      'URAIAN KELOMPOK BARANG': 'Honorarium',
      'ID STANDAR HARGA': 4587247,
      'KODE BARANG': '8.1.02.02.01.0003.00009',
      'URAIAN BARANG': 'Honorarium Moderator',
      SPESIFIKASI: 'Moderator Kegiatan / Diskusi Panel',
      SATUAN: 'Orang / Kegiatan',
      'HARGA SATUAN': 700000,
      'KODE REKENING': '5.1.02.02.001.00003',
    },
  ];

  const wsSSH = XLSX.utils.json_to_sheet(sampleRowsSSH);
  const wsHSPK = XLSX.utils.json_to_sheet(sampleRowsHSPK);
  const wsASB = XLSX.utils.json_to_sheet(sampleRowsASB);
  const wsSBU = XLSX.utils.json_to_sheet(sampleRowsSBU);

  XLSX.utils.book_append_sheet(wb, wsHSPK, 'HSPK');
  XLSX.utils.book_append_sheet(wb, wsSSH, 'SSH');
  XLSX.utils.book_append_sheet(wb, wsASB, 'ASB');
  XLSX.utils.book_append_sheet(wb, wsSBU, 'SBU');

  XLSX.writeFile(wb, 'Template_Standar_Harga_SIPD.xlsx');
}
