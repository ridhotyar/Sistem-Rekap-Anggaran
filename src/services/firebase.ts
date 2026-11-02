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
import firebaseConfig from '../../firebase-applet-config.json';
import { RincianBelanjaItem, SubKegiatan } from '../types/budget';
import { INITIAL_USER_RINCIAN_DATA, INITIAL_SUB_KEGIATAN_LIST } from '../data/initialBudgetData';

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
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or unreachable.');
    }
    // Return false on connection failure, allowing graceful local fallback
    return false;
  }
}

// Collections
const SUB_KEGIATAN_COLLECTION = 'sub_kegiatan';
const RINCIAN_COLLECTION = 'rincian_belanja';

/**
 * Seed initial data into Firestore if collections are empty
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const subSnap = await getDocs(collection(db, SUB_KEGIATAN_COLLECTION));
    if (subSnap.empty) {
      console.log('Seeding initial Sub-Kegiatan data to Firestore...');
      for (const item of INITIAL_SUB_KEGIATAN_LIST) {
        await setDoc(doc(db, SUB_KEGIATAN_COLLECTION, item.id), item);
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
        onData(items);
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

