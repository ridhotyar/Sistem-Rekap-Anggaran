import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  query,
  where,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';
import { RincianBelanjaItem, SubKegiatan, StandarHargaItem } from '../types/budget';
import { AppUser, DEFAULT_USERS } from '../types/auth';
import { INITIAL_USER_RINCIAN_DATA, INITIAL_SUB_KEGIATAN_LIST } from '../data/initialBudgetData';
import { hashPassword, verifyPassword } from './cryptoService';

// Dual configuration: supports both Vite environment variables (for Vercel/Netlify) and firebase-applet-config.json
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig?.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig?.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig?.appId || '',
  // Firestore database: 'ai-studio-150c024a-fb71-4702-88d7-f8d9525658ff'
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    rawConfig?.firestoreDatabaseId ||
    'ai-studio-150c024a-fb71-4702-88d7-f8d9525658ff',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Authentication Provider
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logout(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

// Structured error handling matching Firestore skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface FirestoreQuotaStatus {
  isExhausted: boolean;
  message: string;
  metric?: string;
  resetInfo: string;
  upgradeUrl: string;
}

let quotaStatus: FirestoreQuotaStatus = {
  isExhausted: false,
  message: '',
  resetInfo: 'Batas kuota harian gratis Firebase Firestore (Spark Plan) telah tercapai untuk hari ini dan akan otomatis direset besok hari. Sistem tetap berjalan menggunakan basis data lokal browser (IndexedDB).',
  upgradeUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`,
};

const quotaListeners = new Set<(status: FirestoreQuotaStatus) => void>();

export function getFirestoreQuotaStatus(): FirestoreQuotaStatus {
  return quotaStatus;
}

export function subscribeQuotaStatus(listener: (status: FirestoreQuotaStatus) => void): () => void {
  quotaListeners.add(listener);
  listener(quotaStatus);
  return () => quotaListeners.delete(listener);
}

export function isQuotaExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Quota limit exceeded')
  );
}

export function markQuotaExhausted(rawMessage: string, metric = 'write'): void {
  quotaStatus = {
    isExhausted: true,
    message: rawMessage,
    metric,
    resetInfo: 'Batas kuota transaksi harian gratis Firebase (Spark Plan) telah tercapai hari ini. Sistem otomatis beralih ke penyimpanan lokal browser (IndexedDB) dan akan tersinkronisasi kembali esok hari.',
    upgradeUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`,
  };
  quotaListeners.forEach((l) => l(quotaStatus));
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isQuotaExhaustedError(error)) {
    markQuotaExhausted(error instanceof Error ? error.message : String(error));
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error Handled:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check
export async function testFirestoreConnection(): Promise<boolean> {
  if (quotaStatus.isExhausted) return false;
  try {
    const q = query(collection(db, SUB_KEGIATAN_COLLECTION), limit(1));
    await getDocs(q);
    return true;
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      return false;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or unreachable.');
    } else {
      console.warn('Firestore connection check notice:', error);
    }
    return false;
  }
}

export interface FirestoreConnectionCheckResult {
  connected: boolean;
  message: string;
  reason?: string;
  quotaExhausted?: boolean;
  upgradeUrl?: string;
}

export async function checkFirestoreConnectionStatus(): Promise<FirestoreConnectionCheckResult> {
  if (quotaStatus.isExhausted) {
    return {
      connected: false,
      message: 'Batas Kuota Harian Firebase Tercapai',
      reason: quotaStatus.resetInfo,
      quotaExhausted: true,
      upgradeUrl: quotaStatus.upgradeUrl,
    };
  }

  try {
    const q = query(collection(db, SUB_KEGIATAN_COLLECTION), limit(1));
    await getDocs(q);
    return {
      connected: true,
      message: 'Berhasil terhubung ke basis data Firestore Firebase.',
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    const errMsg = err?.message || String(error);
    const errCode = err?.code || '';

    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(errMsg);
      return {
        connected: false,
        message: 'Batas Kuota Harian Firebase Tercapai',
        reason: quotaStatus.resetInfo,
        quotaExhausted: true,
        upgradeUrl: quotaStatus.upgradeUrl,
      };
    }

    let reason = 'Tidak dapat menghubungi server Firebase. Periksa koneksi internet Anda.';

    if (!navigator.onLine || errMsg.includes('the client is offline') || errMsg.includes('unavailable')) {
      reason = 'Perangkat sedang offline atau jaringan internet tidak dapat menjangkau server Firebase.';
    } else if (
      errCode === 'permission-denied' ||
      errMsg.includes('permission-denied') ||
      errMsg.includes('Missing or insufficient permissions')
    ) {
      reason = 'Izin akses ditolak oleh aturan keamanan (Security Rules) basis data.';
    } else if (errCode === 'not-found' || errMsg.includes('not-found')) {
      reason = 'Basis data Firestore tidak ditemukan atau konfigurasi database tidak sesuai.';
    } else if (errCode === 'unauthenticated') {
      reason = 'Sesi autentikasi pengguna tidak valid atau telah berakhir.';
    } else if (errMsg.includes('API key not valid')) {
      reason = 'Kunci konfigurasi Firebase tidak valid.';
    } else {
      reason = `Gagal berkomunikasi dengan server basis data (${errCode || 'Koneksi terputus'}).`;
    }

    return {
      connected: false,
      message: 'Gagal terhubung ke Firebase',
      reason,
    };
  }
}

// Collections
export const SUB_KEGIATAN_COLLECTION = 'sub_kegiatan';
export const RINCIAN_COLLECTION = 'rincian_belanja';
export const APP_USERS_COLLECTION = 'app_users';
export const STANDAR_HARGA_COLLECTION = 'standar_harga';

/**
 * Menyimpan seluruh katalog Standar Harga ke Firestore dengan arsitektur chunk berkapasitas tinggi.
 * Memecah ribuan data menjadi dokumen chunk (500 item per chunk) untuk menghemat kuota Firestore
 * dan menghindari pembatasan ukuran dokumen 1MB.
 */
export async function saveStandarHargaToFirestore(
  items: StandarHargaItem[]
): Promise<{ success: boolean; message: string; count: number; quotaExhausted?: boolean }> {
  if (quotaStatus.isExhausted) {
    return {
      success: false,
      quotaExhausted: true,
      message: 'Batas kuota harian Firebase Firestore (Spark Plan) telah tercapai hari ini. Data disimpan dengan aman di basis data lokal browser (IndexedDB).',
      count: items.length,
    };
  }

  try {
    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(items.length / CHUNK_SIZE);
    const nowIso = new Date().toISOString();

    // 1. Simpan metadata ringkasan katalog
    const metaDocId = 'catalog_meta';
    const metaPayload = {
      id: metaDocId,
      type: 'meta',
      items: [],
      count: items.length,
      updated_at: nowIso,
    };
    await setDoc(doc(db, STANDAR_HARGA_COLLECTION, metaDocId), metaPayload);

    // 2. Simpan setiap chunk
    for (let c = 0; c < totalChunks; c++) {
      const slice = items.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
      const cleanedSlice = slice.map((item) => cleanFirestoreData(item));
      const chunkDocId = `chunk_${c}`;
      const chunkPayload = {
        id: chunkDocId,
        type: 'chunk',
        items: cleanedSlice,
        count: cleanedSlice.length,
        updated_at: nowIso,
      };
      await setDoc(doc(db, STANDAR_HARGA_COLLECTION, chunkDocId), chunkPayload);
    }

    // 3. Bersihkan chunk lama yang tidak lagi terpakai jika jumlah chunk sekarang lebih sedikit
    try {
      const existingSnap = await getDocs(collection(db, STANDAR_HARGA_COLLECTION));
      for (const d of existingSnap.docs) {
        if (d.id.startsWith('chunk_')) {
          const idx = parseInt(d.id.replace('chunk_', ''), 10);
          if (!isNaN(idx) && idx >= totalChunks) {
            await deleteDoc(d.ref);
          }
        }
      }
    } catch {
      // Non-fatal cleanup notice
    }

    return {
      success: true,
      message: `Berhasil menyimpan ${items.length} standar harga ke cloud database Firebase Firestore (${totalChunks} blok dokumen).`,
      count: items.length,
    };
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        quotaExhausted: true,
        message: 'Batas kuota harian Firebase Firestore (Spark Plan) tercapai untuk hari ini. Data tersimpan aman di basis data lokal browser (IndexedDB).',
        count: items.length,
      };
    }
    console.error('saveStandarHargaToFirestore error:', error);
    handleFirestoreError(error, OperationType.WRITE, STANDAR_HARGA_COLLECTION);
  }
}

/**
 * Lazy Load: Mengambil hanya satu dokumen chunk spesifik dari Firestore sesuai kebutuhan halaman front-end.
 * Menghemat waktu baca dan konsumsi jaringan, tidak perlu mengunduh seluruh database.
 */
export async function loadStandarHargaChunkFromFirestore(
  chunkIdx: number
): Promise<StandarHargaItem[] | null> {
  if (quotaStatus.isExhausted) return null;
  try {
    const chunkDocRef = doc(db, STANDAR_HARGA_COLLECTION, `chunk_${chunkIdx}`);
    const snap = await getDoc(chunkDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.items)) {
        return data.items as StandarHargaItem[];
      }
    }
    return null;
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error), 'read');
    }
    console.warn('loadStandarHargaChunkFromFirestore notice:', error);
    return null;
  }
}

/**
 * Memuat seluruh katalog Standar Harga dari Firestore
 */
export async function loadStandarHargaFromFirestore(): Promise<StandarHargaItem[] | null> {
  try {
    const snap = await getDocs(collection(db, STANDAR_HARGA_COLLECTION));
    if (snap.empty) return null;

    const allItems: StandarHargaItem[] = [];
    const chunkDocs = snap.docs.filter((d) => d.id.startsWith('chunk_'));

    // Urutkan chunk berdasarkan indeks
    chunkDocs.sort((a, b) => {
      const idxA = parseInt(a.id.replace('chunk_', ''), 10) || 0;
      const idxB = parseInt(b.id.replace('chunk_', ''), 10) || 0;
      return idxA - idxB;
    });

    for (const chunkDoc of chunkDocs) {
      const data = chunkDoc.data();
      if (Array.isArray(data.items)) {
        allItems.push(...(data.items as StandarHargaItem[]));
      }
    }

    // Jika ada dokumen tunggal individual (kompatibilitas mundur)
    const singleDocs = snap.docs.filter((d) => !d.id.startsWith('chunk_') && d.id !== 'catalog_meta');
    for (const singleDoc of singleDocs) {
      const data = singleDoc.data();
      if (data.kode_standar_harga && data.nama_standar_harga) {
        allItems.push({ ...data, id: singleDoc.id } as StandarHargaItem);
      }
    }

    return allItems.length > 0 ? allItems : null;
  } catch (error) {
    console.warn('loadStandarHargaFromFirestore notice:', error);
    return null;
  }
}

/**
 * Berlangganan perubahan data Standar Harga dari Firestore
 */
export function subscribeStandarHarga(
  onData: (items: StandarHargaItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, STANDAR_HARGA_COLLECTION),
    (snap) => {
      if (snap.empty) {
        onData([]);
        return;
      }
      const allItems: StandarHargaItem[] = [];
      const chunkDocs = snap.docs.filter((d) => d.id.startsWith('chunk_'));
      chunkDocs.sort((a, b) => {
        const idxA = parseInt(a.id.replace('chunk_', ''), 10) || 0;
        const idxB = parseInt(b.id.replace('chunk_', ''), 10) || 0;
        return idxA - idxB;
      });

      for (const chunkDoc of chunkDocs) {
        const data = chunkDoc.data();
        if (Array.isArray(data.items)) {
          allItems.push(...(data.items as StandarHargaItem[]));
        }
      }

      onData(allItems);
    },
    (error) => {
      console.warn('subscribeStandarHarga error:', error);
      onError?.(error);
    }
  );
}

/**
 * Seed initial users into Firestore with encrypted password hashes if collection is empty
 */
export async function seedInitialUsersIfEmpty(): Promise<void> {
  try {
    const userSnap = await getDocs(collection(db, APP_USERS_COLLECTION));
    if (userSnap.empty) {
      console.log(`Menyimpan ${DEFAULT_USERS.length} akun pengguna bawaan dengan hash terenkripsi ke Firestore...`);
      for (const user of DEFAULT_USERS) {
        const { password, ...safeUser } = user;
        await setDoc(doc(db, APP_USERS_COLLECTION, user.id), safeUser, { merge: true });
      }
    }
  } catch (error) {
    console.warn('Seed app_users Firestore notice:', error);
  }
}

/**
 * Seed initial data into Firestore if collections are empty or missing new base sub-kegiatans
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    // 1. Seed users (with encrypted hashes)
    await seedInitialUsersIfEmpty();

    // 2. Seed sub_kegiatan
    const subSnap = await getDocs(collection(db, SUB_KEGIATAN_COLLECTION));
    if (subSnap.size < INITIAL_SUB_KEGIATAN_LIST.length) {
      console.log(`Seeding initial Sub-Kegiatan data to Firestore (${INITIAL_SUB_KEGIATAN_LIST.length} items)...`);
      for (const item of INITIAL_SUB_KEGIATAN_LIST) {
        await setDoc(doc(db, SUB_KEGIATAN_COLLECTION, item.id), item, { merge: true });
      }
    }

    // 3. Seed rincian
    const rincianSnap = await getDocs(collection(db, RINCIAN_COLLECTION));
    if (rincianSnap.empty) {
      console.log('Seeding initial Rincian Belanja data to Firestore...');
      for (const item of INITIAL_USER_RINCIAN_DATA) {
        const docId = item.id || `rinci-${item.id_rinci_sub_bl}`;
        await setDoc(doc(db, RINCIAN_COLLECTION, docId), { ...item, id: docId });
      }
    }
  } catch (error) {
    console.warn('Could not auto-seed Firestore directly (offline or rules in effect):', error);
  }
}

/**
 * Force sync and upload current local data and users to Firestore
 */
export async function forceSyncLocalToFirestore(
  subList: SubKegiatan[],
  rincianList: RincianBelanjaItem[],
  userList?: AppUser[],
  standarHargaList?: StandarHargaItem[]
): Promise<{ success: boolean; message: string }> {
  if (quotaStatus.isExhausted) {
    return {
      success: false,
      message: 'Batas kuota harian Firebase Firestore (Spark Plan) telah tercapai hari ini. Data disimpan aman pada basis data lokal browser (IndexedDB).',
    };
  }
  try {
    // Sync sub kegiatan
    for (const sub of subList) {
      await setDoc(doc(db, SUB_KEGIATAN_COLLECTION, sub.id), cleanFirestoreData(sub), { merge: true });
    }
    // Sync rincian belanja
    for (const item of rincianList) {
      const docId = item.id || `rinci-${item.id_rinci_sub_bl}`;
      await setDoc(doc(db, RINCIAN_COLLECTION, docId), cleanFirestoreData({ ...item, id: docId }), { merge: true });
    }
    // Sync users without plaintext passwords
    if (userList && userList.length > 0) {
      for (const user of userList) {
        const { password, ...safeUser } = user;
        await setDoc(doc(db, APP_USERS_COLLECTION, user.id), cleanFirestoreData(safeUser), { merge: true });
      }
    }
    // Sync standar harga jika disediakan
    if (standarHargaList && standarHargaList.length > 0) {
      await saveStandarHargaToFirestore(standarHargaList);
    }
    return {
      success: true,
      message: `Berhasil sinkronisasi ${subList.length} sub-kegiatan, ${rincianList.length} rincian belanja, ${userList?.length || 0} akun pengguna, dan ${standarHargaList?.length || 0} standar harga ke Firebase!`,
    };
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        message: 'Batas kuota harian Firebase Firestore (Spark Plan) tercapai untuk hari ini. Data disimpan aman pada basis data lokal (IndexedDB).',
      };
    }
    console.error('Force sync to Firestore error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Authenticate a single user against Firestore when login button is clicked.
 * Hits Firestore ONLY for this specific username and compares encrypted/hashed password.
 */
export async function authenticateUserFromFirestore(
  username: string,
  passwordAttempt: string
): Promise<AppUser | null> {
  const cleanUsername = username.trim().toLowerCase();
  try {
    const q = query(
      collection(db, APP_USERS_COLLECTION),
      where('username', '==', cleanUsername),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    const data = docSnap.data() as AppUser;

    if (data.passwordHash && data.salt) {
      const isMatch = await verifyPassword(passwordAttempt, data.passwordHash, data.salt);
      if (isMatch) {
        return {
          id: docSnap.id,
          username: data.username,
          nama: data.nama,
          role: data.role,
          bidang: data.bidang,
          jabatan: data.jabatan,
          createdAt: data.createdAt,
        };
      }
    } else if (data.password && data.password === passwordAttempt) {
      // Auto-upgrade legacy plaintext to encrypted hash
      const { hash, salt } = await hashPassword(passwordAttempt);
      await updateDoc(docSnap.ref, { passwordHash: hash, salt, password: '[PROTECTED]' });
      return {
        id: docSnap.id,
        username: data.username,
        nama: data.nama,
        role: data.role,
        bidang: data.bidang,
        jabatan: data.jabatan,
        createdAt: data.createdAt,
      };
    }
    return null;
  } catch (err) {
    console.warn('Firestore authenticateUser query notice:', err);
    return null;
  }
}

/**
 * Listen to all App Users in real-time (Only invoked when Admin opens User Management)
 */
export function subscribeAppUsers(
  onData: (data: AppUser[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, APP_USERS_COLLECTION),
    (snapshot) => {
      if (snapshot.empty) {
        onData(DEFAULT_USERS.map(({ password, ...u }) => u as AppUser));
      } else {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as AppUser;
          // Strip any plaintext password before sending to components
          const { password, ...safe } = data;
          return { ...safe, id: docSnap.id } as AppUser;
        });
        onData(items);
      }
    },
    (error) => {
      console.error('Subscription error on app_users:', error);
      onError?.(error);
    }
  );
}

/**
 * Save an App User to Firestore (Always strip plaintext password and save passwordHash + salt)
 */
export async function saveAppUser(user: AppUser): Promise<void> {
  const docId = user.id;
  const { password, ...safeUser } = user;
  try {
    await setDoc(doc(db, APP_USERS_COLLECTION, docId), cleanFirestoreData(safeUser), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${APP_USERS_COLLECTION}/${docId}`);
  }
}

/**
 * Delete an App User from Firestore
 */
export async function removeAppUser(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, APP_USERS_COLLECTION, userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${APP_USERS_COLLECTION}/${userId}`);
  }
}

/**
 * Listen to ALL Rincian Belanja in real-time
 */
export function subscribeAllRincianBelanja(
  onData: (data: RincianBelanjaItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, RINCIAN_COLLECTION),
    (snapshot) => {
      if (snapshot.empty) {
        onData(INITIAL_USER_RINCIAN_DATA);
      } else {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as RincianBelanjaItem;
          const official = INITIAL_USER_RINCIAN_DATA.find((i) => i.id_rinci_sub_bl === data.id_rinci_sub_bl);
          return official
            ? {
                ...official,
                ...data,
                id: docSnap.id,
                ket_bl_teks: data.ket_bl_teks || official.ket_bl_teks,
                nama_subs_sub_bl: data.nama_subs_sub_bl || official.nama_subs_sub_bl,
              }
            : ({ ...data, id: docSnap.id } as RincianBelanjaItem);
        });

        // Ensure baseline initial items are preserved if Firestore only contains imported sub-kegiatans
        const existingIds = new Set(items.map((i) => i.id_rinci_sub_bl));
        INITIAL_USER_RINCIAN_DATA.forEach((init) => {
          if (!existingIds.has(init.id_rinci_sub_bl)) {
            items.push(init);
          }
        });

        onData(items);
      }
    },
    (error) => {
      console.error('Subscription error on all rincian_belanja:', error);
      onError?.(error);
    }
  );
}

/**
 * Listen to all Sub-Kegiatan in real-time
 */
export function subscribeSubKegiatan(
  onData: (data: SubKegiatan[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, SUB_KEGIATAN_COLLECTION),
    (snapshot) => {
      if (snapshot.empty) {
        onData(INITIAL_SUB_KEGIATAN_LIST);
      } else {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as SubKegiatan;
          const official = INITIAL_SUB_KEGIATAN_LIST.find((o) => o.id_sub_bl === data.id_sub_bl);
          return official
            ? {
                ...official,
                ...data,
                id: docSnap.id,
                kode_sub_kegiatan: official.kode_sub_kegiatan || data.kode_sub_kegiatan,
                nama_sub_kegiatan: official.nama_sub_kegiatan || data.nama_sub_kegiatan,
                nama_program: official.nama_program || data.nama_program,
                kode_program: official.kode_program || data.kode_program,
                nama_kegiatan: official.nama_kegiatan || official.nama_giat || data.nama_kegiatan,
                kode_kegiatan: official.kode_kegiatan || official.kode_giat || data.kode_kegiatan,
                nama_skpd: official.nama_skpd || official.nama_unit || data.nama_skpd,
                kode_skpd: official.kode_skpd || data.kode_skpd,
                nama_daerah: official.nama_daerah || data.nama_daerah || 'Provinsi Nusa Tenggara Barat',
              }
            : ({ ...data, id: docSnap.id } as SubKegiatan);
        });

        // Ensure all official 51 sub-kegiatans are present
        const existingIds = new Set(items.map((i) => i.id_sub_bl));
        const combined = [...items];
        INITIAL_SUB_KEGIATAN_LIST.forEach((official) => {
          if (!existingIds.has(official.id_sub_bl)) {
            combined.push(official);
          }
        });

        onData(combined);
      }
    },
    (error) => {
      console.error('Subscription error on sub_kegiatan:', error);
      onError?.(error);
    }
  );
}

/**
 * Listen to Rincian Belanja for a specific sub-kegiatan or all
 */
export function subscribeRincianBelanja(
  idSubBl: number,
  onData: (data: RincianBelanjaItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, RINCIAN_COLLECTION), where('id_sub_bl', '==', idSubBl));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        const local = INITIAL_USER_RINCIAN_DATA.filter((i) => i.id_sub_bl === idSubBl);
        onData(local);
      } else {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as RincianBelanjaItem;
          const official = INITIAL_USER_RINCIAN_DATA.find((i) => i.id_rinci_sub_bl === data.id_rinci_sub_bl);
          return official
            ? {
                ...data,
                id: docSnap.id,
                ket_bl_teks: data.ket_bl_teks || official.ket_bl_teks,
                nama_subs_sub_bl: data.nama_subs_sub_bl || official.nama_subs_sub_bl,
              }
            : ({ ...data, id: docSnap.id } as RincianBelanjaItem);
        });
        onData(items);
      }
    },
    (error) => {
      console.error('Subscription error on rincian_belanja:', error);
      onError?.(error);
    }
  );
}

/**
 * Helper to strip undefined values so Firestore setDoc never throws invalid data errors
 */
function cleanFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

/**
 * Add or update a Rincian Belanja item in Firestore
 */
export async function saveRincianBelanja(item: RincianBelanjaItem): Promise<void> {
  if (quotaStatus.isExhausted) {
    return;
  }
  const docId = item.id || `rinci-${item.id_rinci_sub_bl}`;
  const payload = cleanFirestoreData({
    ...item,
    id: docId,
    updated_at: new Date().toISOString(),
  });

  try {
    await setDoc(doc(db, RINCIAN_COLLECTION, docId), payload);
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `${RINCIAN_COLLECTION}/${docId}`);
  }
}

/**
 * Delete a Rincian Belanja item in Firestore
 */
export async function removeRincianBelanja(docId: string): Promise<void> {
  if (quotaStatus.isExhausted) return;
  try {
    await deleteDoc(doc(db, RINCIAN_COLLECTION, docId));
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `${RINCIAN_COLLECTION}/${docId}`);
  }
}

/**
 * Update a Sub-Kegiatan summary in Firestore
 */
export async function saveSubKegiatan(sub: SubKegiatan): Promise<void> {
  if (quotaStatus.isExhausted) return;
  const docId = sub.id;
  try {
    await setDoc(doc(db, SUB_KEGIATAN_COLLECTION, docId), cleanFirestoreData(sub), { merge: true });
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `${SUB_KEGIATAN_COLLECTION}/${docId}`);
  }
}

/**
 * Delete a Sub-Kegiatan and its associated rincian belanja items from Firestore
 */
export async function removeSubKegiatan(docId: string, idSubBl: number): Promise<void> {
  if (quotaStatus.isExhausted) return;
  try {
    // 1. Delete Sub-Kegiatan document
    await deleteDoc(doc(db, SUB_KEGIATAN_COLLECTION, docId));

    // 2. Query and delete associated rincian belanja items
    const q = query(collection(db, RINCIAN_COLLECTION), where('id_sub_bl', '==', idSubBl));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map((docItem) => deleteDoc(docItem.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markQuotaExhausted(error instanceof Error ? error.message : String(error));
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `${SUB_KEGIATAN_COLLECTION}/${docId}`);
  }
}
