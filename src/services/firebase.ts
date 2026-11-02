import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
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
import { RincianBelanjaItem, SubKegiatan } from '../types/budget';
import { INITIAL_USER_RINCIAN_DATA, INITIAL_SUB_KEGIATAN_LIST } from '../data/initialBudgetData';

// Dual configuration: supports both Vite environment variables (for Vercel/Netlify) and firebase-applet-config.json
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig?.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig?.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig?.appId || '',
  // SANGAT PENTING: Firestore menggunakan database bernama 'ai-studio-150c024a-fb71-4702-88d7-f8d9525658ff'
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const q = query(collection(db, SUB_KEGIATAN_COLLECTION), limit(1));
    await getDocs(q);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or unreachable.');
    } else {
      console.warn('Firestore connection check notice:', error);
    }
    // Return false on connection failure, allowing graceful local fallback
    return false;
  }
}

export interface FirestoreConnectionCheckResult {
  connected: boolean;
  message: string;
  reason?: string;
}

export async function checkFirestoreConnectionStatus(): Promise<FirestoreConnectionCheckResult> {
  try {
    const q = query(collection(db, SUB_KEGIATAN_COLLECTION), limit(1));
    await getDocs(q);
    return {
      connected: true,
      message: 'Berhasil terhubung ke basis data Firestore.',
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    const errMsg = err?.message || String(error);
    const errCode = err?.code || '';

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
const SUB_KEGIATAN_COLLECTION = 'sub_kegiatan';
const RINCIAN_COLLECTION = 'rincian_belanja';

/**
 * Seed initial data into Firestore if collections are empty or missing new base sub-kegiatans
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const subSnap = await getDocs(collection(db, SUB_KEGIATAN_COLLECTION));
    if (subSnap.size < INITIAL_SUB_KEGIATAN_LIST.length) {
      console.log(`Seeding initial Sub-Kegiatan data to Firestore (${INITIAL_SUB_KEGIATAN_LIST.length} items)...`);
      for (const item of INITIAL_SUB_KEGIATAN_LIST) {
        await setDoc(doc(db, SUB_KEGIATAN_COLLECTION, item.id), item, { merge: true });
      }
    }

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
 * Force sync and upload current local data to Firestore
 */
export async function forceSyncLocalToFirestore(
  subList: SubKegiatan[],
  rincianList: RincianBelanjaItem[]
): Promise<{ success: boolean; message: string }> {
  try {
    for (const sub of subList) {
      await setDoc(doc(db, SUB_KEGIATAN_COLLECTION, sub.id), sub, { merge: true });
    }
    for (const item of rincianList) {
      const docId = item.id || `rinci-${item.id_rinci_sub_bl}`;
      await setDoc(doc(db, RINCIAN_COLLECTION, docId), { ...item, id: docId }, { merge: true });
    }
    return {
      success: true,
      message: `Berhasil sinkronisasi ${subList.length} sub-kegiatan dan ${rincianList.length} rincian ke Firestore!`,
    };
  } catch (error) {
    console.error('Force sync to Firestore error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
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
            ? { ...official, ...data, id: docSnap.id }
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
        // Filter from initial data if 122054
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
 * Add or update a Rincian Belanja item in Firestore
 */
export async function saveRincianBelanja(item: RincianBelanjaItem): Promise<void> {
  const docId = item.id || `rinci-${item.id_rinci_sub_bl}`;
  const payload = {
    ...item,
    id: docId,
    updated_at: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, RINCIAN_COLLECTION, docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RINCIAN_COLLECTION}/${docId}`);
  }
}

/**
 * Delete a Rincian Belanja item in Firestore
 */
export async function removeRincianBelanja(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, RINCIAN_COLLECTION, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${RINCIAN_COLLECTION}/${docId}`);
  }
}

/**
 * Update a Sub-Kegiatan summary in Firestore
 */
export async function saveSubKegiatan(sub: SubKegiatan): Promise<void> {
  const docId = sub.id;
  try {
    await setDoc(doc(db, SUB_KEGIATAN_COLLECTION, docId), sub, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SUB_KEGIATAN_COLLECTION}/${docId}`);
  }
}

/**
 * Delete a Sub-Kegiatan and its associated rincian belanja items from Firestore
 */
export async function removeSubKegiatan(docId: string, idSubBl: number): Promise<void> {
  try {
    // 1. Delete Sub-Kegiatan document
    await deleteDoc(doc(db, SUB_KEGIATAN_COLLECTION, docId));

    // 2. Query and delete associated rincian belanja items
    const q = query(collection(db, RINCIAN_COLLECTION), where('id_sub_bl', '==', idSubBl));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map((docItem) => deleteDoc(docItem.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SUB_KEGIATAN_COLLECTION}/${docId}`);
  }
}

