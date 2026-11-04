import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from './components/templates/AppLayout';
import { SubKegiatanListPage } from './components/pages/SubKegiatanListPage';
import { SubKegiatanDetailPage } from './components/pages/SubKegiatanDetailPage';
import { LoginPage } from './components/pages/LoginPage';
import { ImportExportModal } from './components/organisms/ImportExportModal';
import { ConfirmDeleteSubKegiatanModal } from './components/organisms/ConfirmDeleteSubKegiatanModal';
import { FirebaseSyncGuideModal } from './components/organisms/FirebaseSyncGuideModal';
import { UserManagementModal } from './components/organisms/UserManagementModal';
import {
  testFirestoreConnection,
  subscribeAuth,
  subscribeSubKegiatan,
  subscribeAllRincianBelanja,
  saveRincianBelanja,
  saveSubKegiatan,
  removeRincianBelanja,
  removeSubKegiatan,
  seedInitialDataIfEmpty,
  forceSyncLocalToFirestore,
} from './services/firebase';
import {
  INITIAL_USER_RINCIAN_DATA,
  INITIAL_SUB_KEGIATAN_LIST,
} from './data/initialBudgetData';
import { BASE_SUB_KEGIATAN_LIST } from './data/initialSubKegiatanData';
import { SubKegiatan, RincianBelanjaItem, KeteranganSubBl } from './types/budget';
import { AppUser } from './types/auth';
import { getCurrentAuthUser, logoutAppUser } from './services/authService';
import { RouterProvider, useRouter } from './services/router';
import type { User } from 'firebase/auth';

const LOCAL_STORAGE_KEY_RINCIAN = 'sipd_budget_rincian_v1';
const LOCAL_STORAGE_KEY_SUB = 'sipd_budget_sub_kegiatan_v1';

function AppContent() {
  const { route, navigate } = useRouter();

  // App Auth state (Role: admin | user)
  const [appUser, setAppUser] = useState<AppUser | null>(() => getCurrentAuthUser());
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // Data states
  const [subKegiatans, setSubKegiatans] = useState<SubKegiatan[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SUB);
      if (saved) {
        const parsed = JSON.parse(saved) as SubKegiatan[];
        const officialMap = new Map(INITIAL_SUB_KEGIATAN_LIST.map((o) => [o.id_sub_bl, o]));
        const mergedList = INITIAL_SUB_KEGIATAN_LIST.map((official) => {
          const userSaved = parsed.find((p) => p.id_sub_bl === official.id_sub_bl);
          return userSaved
            ? {
                ...official,
                ...userSaved,
                kode_sub_kegiatan: official.kode_sub_kegiatan || userSaved.kode_sub_kegiatan,
                nama_sub_kegiatan: official.nama_sub_kegiatan || userSaved.nama_sub_kegiatan,
                nama_program: official.nama_program || userSaved.nama_program,
                kode_program: official.kode_program || userSaved.kode_program,
                nama_kegiatan: official.nama_kegiatan || official.nama_giat || userSaved.nama_kegiatan,
                kode_kegiatan: official.kode_kegiatan || official.kode_giat || userSaved.kode_kegiatan,
                nama_skpd: official.nama_skpd || official.nama_unit || userSaved.nama_skpd,
                kode_skpd: official.kode_skpd || userSaved.kode_skpd,
                nama_daerah: official.nama_daerah || userSaved.nama_daerah || 'Provinsi Nusa Tenggara Barat',
                pagu_indikatif: userSaved.pagu_indikatif || official.pagu_indikatif,
              }
            : official;
        });
        parsed.forEach((p) => {
          if (!officialMap.has(p.id_sub_bl)) {
            mergedList.push(p);
          }
        });
        return mergedList;
      }
      return INITIAL_SUB_KEGIATAN_LIST;
    } catch {
      return INITIAL_SUB_KEGIATAN_LIST;
    }
  });

  const [rincianItems, setRincianItems] = useState<RincianBelanjaItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_RINCIAN);
      if (saved) {
        const parsed = JSON.parse(saved) as RincianBelanjaItem[];
        return parsed.map((item) => {
          const matchInitial = INITIAL_USER_RINCIAN_DATA.find((i) => i.id_rinci_sub_bl === item.id_rinci_sub_bl);
          return matchInitial
            ? {
                ...item,
                ket_bl_teks: item.ket_bl_teks || matchInitial.ket_bl_teks,
                nama_subs_sub_bl: item.nama_subs_sub_bl || matchInitial.nama_subs_sub_bl,
              }
            : item;
        });
      }
      return INITIAL_USER_RINCIAN_DATA;
    } catch {
      return INITIAL_USER_RINCIAN_DATA;
    }
  });

  // Firebase auth & sync state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [isFirebaseGuideOpen, setIsFirebaseGuideOpen] = useState<boolean>(false);
  const [subKegiatanToDelete, setSubKegiatanToDelete] = useState<SubKegiatan | null>(null);
  const [isDeletingSubKegiatan, setIsDeletingSubKegiatan] = useState<boolean>(false);

  const isAdmin = appUser?.role === 'admin';

  // Sync to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_RINCIAN, JSON.stringify(rincianItems));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [rincianItems]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SUB, JSON.stringify(subKegiatans));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [subKegiatans]);

  // Recalculate Sub-Kegiatan aggregated totals & Keterangan list based on current rincian items
  useEffect(() => {
    setSubKegiatans((prevList) => {
      return prevList.map((sub) => {
        const matchingRincian = rincianItems.filter((i) => i.id_sub_bl === sub.id_sub_bl);
        if (matchingRincian.length > 0) {
          const total = matchingRincian.reduce((acc, curr) => {
            const hasUserAdj = curr.user_total_harga !== undefined || curr.is_user_added;
            const price = hasUserAdj ? curr.user_total_harga || 0 : curr.total_harga || 0;
            return acc + price;
          }, 0);

          const currentKetList = sub.keterangan_list || [];
          const distinctKetIds = Array.from(new Set(matchingRincian.map((i) => i.id_ket_sub_bl)));

          const updatedKetList = distinctKetIds.map((ketId) => {
            const existing = currentKetList.find((k) => k.id_ket_sub_bl === ketId);
            const ketRincian = matchingRincian.filter((i) => i.id_ket_sub_bl === ketId);
            const ketTotal = ketRincian.reduce((acc, curr) => {
              const hasUserAdj = curr.user_total_harga !== undefined || curr.is_user_added;
              return acc + (hasUserAdj ? curr.user_total_harga || 0 : curr.total_harga || 0);
            }, 0);
            const ketCount = ketRincian.length;
            const sample = ketRincian[0];

            const base = existing || ({
              id_ket_sub_bl: ketId,
              id_sub_bl: sub.id_sub_bl,
              ket_bl_teks: sample?.ket_bl_teks || `Paket Keterangan Belanja`,
              tahun: sub.tahun,
              id_daerah: sub.id_daerah,
              id_unit: sub.id_unit || 82,
              id_skpd: sub.id_skpd || 82,
              id_sub_skpd: sub.id_skpd || 82,
              id_program: sub.id_program || 7554,
              id_giat: sub.id_giat || 12816,
              id_sub_giat: sub.id_sub_giat || 54528,
              nama_daerah: sub.nama_daerah || 'Provinsi Nusa Tenggara Barat',
              nama_unit: sub.nama_unit || 'Badan Kesatuan Bangsa dan Politik Dalam Negeri',
              nama_skpd: sub.nama_skpd || 'Badan Kesatuan Bangsa dan Politik Dalam Negeri',
              nama_sub_skpd: sub.nama_skpd || 'Badan Kesatuan Bangsa dan Politik Dalam Negeri',
              nama_program: sub.nama_program || '',
              nama_giat: sub.nama_giat || sub.nama_kegiatan || '',
              nama_sub_giat: sub.nama_sub_giat || sub.nama_sub_kegiatan || '',
              id_bl: 0,
              id_unik: `ket-${ketId}`,
            } as KeteranganSubBl);

            return {
              ...base,
              ket_bl_teks: base.ket_bl_teks || sample?.ket_bl_teks || 'Aktivitas Belanja',
              total_pagu: ketTotal,
              rincian_count: ketCount,
            } as KeteranganSubBl;
          });

          return {
            ...sub,
            rincian_count: matchingRincian.length,
            total_rincian: total,
            pagu_indikatif: total > 0 ? total : sub.pagu_indikatif,
            keterangan_list: updatedKetList,
          };
        }
        return sub;
      });
    });
  }, [rincianItems]);

  // Init Firebase connection and listeners
  useEffect(() => {
    let isMounted = true;

    const unsubAuth = subscribeAuth((user) => {
      if (isMounted) setCurrentUser(user);
    });

    const initFirebase = async () => {
      setIsSyncing(true);
      const isConnected = await testFirestoreConnection();
      if (!isMounted) return;

      setIsFirebaseConnected(isConnected);

      if (isConnected) {
        await seedInitialDataIfEmpty();

        subscribeSubKegiatan(
          (data) => {
            if (isMounted && data.length > 0) {
              setSubKegiatans(data);
              setIsFirebaseConnected(true);
            }
          },
          (err) => console.warn('SubKegiatan sync warning:', err)
        );

        subscribeAllRincianBelanja(
          (data) => {
            if (isMounted && data.length > 0) {
              setRincianItems(data);
              setIsFirebaseConnected(true);
            }
          },
          (err) => console.warn('RincianBelanja sync warning:', err)
        );
      }
      setIsSyncing(false);
    };

    initFirebase();

    return () => {
      isMounted = false;
      unsubAuth();
    };
  }, []);

  // Handlers for Login & Logout
  const handleLoginSuccess = (user: AppUser) => {
    setAppUser(user);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logoutAppUser();
    setAppUser(null);
    navigate('/');
  };

  // Sub-kegiatan selection navigation
  const handleSelectSubKegiatan = (sub: SubKegiatan) => {
    navigate(`/sub-kegiatan/${sub.id_sub_bl}`);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // CRUD for Rincian Belanja Items
  const handleSaveItem = async (item: RincianBelanjaItem) => {
    const docId = item.id || `rinci-${item.id_rinci_sub_bl || Date.now()}`;
    const newItem: RincianBelanjaItem = {
      ...item,
      id: docId,
      id_rinci_sub_bl: item.id_rinci_sub_bl || Math.floor(2300000 + Math.random() * 90000),
      updated_at: new Date().toISOString(),
    };

    // Optimistic local update
    setRincianItems((prev) => {
      const idx = prev.findIndex((i) => (i.id && i.id === docId) || i.id_rinci_sub_bl === newItem.id_rinci_sub_bl);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newItem;
        return copy;
      }
      return [newItem, ...prev];
    });

    // Save to Firestore if connected
    try {
      await saveRincianBelanja(newItem);
    } catch (e) {
      console.warn('Saved locally, Firestore sync deferred:', e);
    }
  };

  const handleDeleteItem = async (item: RincianBelanjaItem) => {
    // Permission check: Only Admin can delete base JSON items.
    if (!isAdmin && !item.is_user_added) {
      alert('Hanya akun Administrator yang berhak menghapus rincian belanja dasar dari JSON.');
      return;
    }

    const docId = item.id || `rinci-${item.id_rinci_sub_bl}`;

    // Optimistic local update
    setRincianItems((prev) =>
      prev.filter((i) => (i.id ? i.id !== docId : i.id_rinci_sub_bl !== item.id_rinci_sub_bl))
    );

    // Delete in Firestore
    try {
      await removeRincianBelanja(docId);
    } catch (e) {
      console.warn('Deleted locally, Firestore sync deferred:', e);
    }
  };

  const handleRequestDeleteSubKegiatan = (sub: SubKegiatan) => {
    if (!isAdmin) {
      alert('Hanya akun Administrator yang berhak menghapus Sub-Kegiatan.');
      return;
    }
    setSubKegiatanToDelete(sub);
  };

  const handleConfirmDeleteSubKegiatan = async (sub: SubKegiatan) => {
    if (!isAdmin) return;
    setIsDeletingSubKegiatan(true);
    try {
      setRincianItems((prev) => prev.filter((i) => i.id_sub_bl !== sub.id_sub_bl));
      setSubKegiatans((prev) => prev.filter((s) => s.id !== sub.id && s.id_sub_bl !== sub.id_sub_bl));

      // If currently on that sub-kegiatan page, go back to dashboard
      if (route.params.idSubBl === sub.id_sub_bl) {
        navigate('/dashboard');
      }

      await removeSubKegiatan(sub.id, sub.id_sub_bl);
    } catch (e) {
      console.warn('SubKegiatan deleted locally, Firestore sync deferred:', e);
    } finally {
      setIsDeletingSubKegiatan(false);
      setSubKegiatanToDelete(null);
    }
  };

  // Only Admin can apply Dual JSON
  const handleApplyDualJson = async (
    mergedSubKegiatan: SubKegiatan,
    mergedRincian: RincianBelanjaItem[]
  ) => {
    if (!isAdmin) {
      alert('Hanya akun Administrator yang berhak mengimport data menggunakan JSON.');
      return;
    }

    setSubKegiatans((prev) => {
      const existingIndex = prev.findIndex((s) => s.id_sub_bl === mergedSubKegiatan.id_sub_bl);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = mergedSubKegiatan;
        return copy;
      }
      return [mergedSubKegiatan, ...prev];
    });

    setRincianItems((prev) => {
      const others = prev.filter((i) => i.id_sub_bl !== mergedSubKegiatan.id_sub_bl);
      return [...mergedRincian, ...others];
    });

    // Navigate to the newly updated sub-kegiatan detail page
    navigate(`/sub-kegiatan/${mergedSubKegiatan.id_sub_bl}`);

    try {
      await saveSubKegiatan(mergedSubKegiatan);
      for (const item of mergedRincian) {
        await saveRincianBelanja(item);
      }
    } catch (err) {
      console.warn('Firestore deferred sync on dual import:', err);
    }
  };

  const handleResetToDefault = async () => {
    if (!isAdmin) {
      alert('Hanya Administrator yang dapat mereset data basis.');
      return;
    }
    setRincianItems(INITIAL_USER_RINCIAN_DATA);
    setSubKegiatans(INITIAL_SUB_KEGIATAN_LIST);
    for (const item of INITIAL_USER_RINCIAN_DATA) {
      try {
        await saveRincianBelanja(item);
      } catch (e) {
        // Ignored in local mode
      }
    }
  };

  const handleRefresh = async () => {
    setIsSyncing(true);
    const connected = await testFirestoreConnection();
    setIsFirebaseConnected(connected);
    if (connected) {
      await forceSyncLocalToFirestore(subKegiatans, rincianItems);
    }
    setTimeout(() => {
      setIsSyncing(false);
    }, 600);
  };

  // Active sub-kegiatan lookup for /sub-kegiatan/:idSubBl route
  const activeSubKegiatan = useMemo(() => {
    if (!route.params.idSubBl) return null;
    const targetId = route.params.idSubBl;

    // Look in current state first
    const foundInState = subKegiatans.find((s) => s.id_sub_bl === targetId);
    if (foundInState) return foundInState;

    // Look in official baseline list
    const foundInBase = BASE_SUB_KEGIATAN_LIST.find((s) => s.id_sub_bl === targetId);
    if (foundInBase) return foundInBase as unknown as SubKegiatan;

    const foundInInit = INITIAL_SUB_KEGIATAN_LIST.find((s) => s.id_sub_bl === targetId);
    if (foundInInit) return foundInInit;

    return null;
  }, [route.params.idSubBl, subKegiatans]);

  // Route 1: Root "/" - Landing Page with exact Title and Login Form
  if (route.pathname === '/' || route.pathname === '') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        currentUser={appUser}
        onGoToDashboard={() => navigate('/dashboard')}
      />
    );
  }

  // Protected route check: if user is not logged in and attempts /dashboard or /sub-kegiatan, redirect to /
  if (!appUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        currentUser={null}
        onGoToDashboard={() => navigate('/dashboard')}
      />
    );
  }

  // Route 2: Detail Page "/sub-kegiatan/:idSubBl"
  if (route.pathname.startsWith('/sub-kegiatan')) {
    if (!activeSubKegiatan) {
      return (
        <AppLayout
          currentUser={currentUser}
          appUser={appUser}
          isFirebaseConnected={isFirebaseConnected}
          onOpenImportExport={() => setIsImportExportOpen(true)}
          onOpenUserManagement={() => setIsUserManagementOpen(true)}
          onLogout={handleLogout}
          onRefreshData={handleRefresh}
          onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
          isSyncing={isSyncing}
        >
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Sub-Kegiatan Tidak Ditemukan
            </h2>
            <p className="text-xs text-slate-500">
              ID Sub-Kegiatan #{route.params.idSubBl} tidak terdaftar dalam database APBD TA 2027.
            </p>
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer shadow-md"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </AppLayout>
      );
    }

    const currentSubRincianItems = rincianItems.filter(
      (i) => i.id_sub_bl === activeSubKegiatan.id_sub_bl
    );

    return (
      <AppLayout
        currentUser={currentUser}
        appUser={appUser}
        isFirebaseConnected={isFirebaseConnected}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onLogout={handleLogout}
        onRefreshData={handleRefresh}
        onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
        isSyncing={isSyncing}
      >
        <SubKegiatanDetailPage
          subKegiatan={activeSubKegiatan}
          items={currentSubRincianItems}
          onBackToSummary={handleBackToDashboard}
          onSaveItem={handleSaveItem}
          onDeleteItem={handleDeleteItem}
          onDeleteSubKegiatan={isAdmin ? handleRequestDeleteSubKegiatan : undefined}
          currentUser={appUser}
          isAdmin={isAdmin}
        />

        {/* Global Modals */}
        {isAdmin && (
          <ImportExportModal
            isOpen={isImportExportOpen}
            onClose={() => setIsImportExportOpen(false)}
            currentItems={rincianItems}
            activeSubKegiatan={activeSubKegiatan}
            onApplyDualJson={handleApplyDualJson}
            onResetToDefault={handleResetToDefault}
          />
        )}

        {isAdmin && (
          <UserManagementModal
            isOpen={isUserManagementOpen}
            onClose={() => setIsUserManagementOpen(false)}
            currentUser={appUser}
          />
        )}

        <ConfirmDeleteSubKegiatanModal
          isOpen={Boolean(subKegiatanToDelete)}
          onClose={() => setSubKegiatanToDelete(null)}
          subKegiatan={subKegiatanToDelete}
          onConfirm={handleConfirmDeleteSubKegiatan}
          isDeleting={isDeletingSubKegiatan}
        />

        <FirebaseSyncGuideModal
          isOpen={isFirebaseGuideOpen}
          onClose={() => setIsFirebaseGuideOpen(false)}
          isFirebaseConnected={isFirebaseConnected}
          subKegiatans={subKegiatans}
          rincianItems={rincianItems}
          onSyncComplete={handleRefresh}
        />
      </AppLayout>
    );
  }

  // Route 3: "/dashboard" or fallback
  return (
    <AppLayout
      currentUser={currentUser}
      appUser={appUser}
      isFirebaseConnected={isFirebaseConnected}
      onOpenImportExport={() => setIsImportExportOpen(true)}
      onOpenUserManagement={() => setIsUserManagementOpen(true)}
      onLogout={handleLogout}
      onRefreshData={handleRefresh}
      onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
      isSyncing={isSyncing}
    >
      <SubKegiatanListPage
        subKegiatans={subKegiatans}
        onSelectSubKegiatan={handleSelectSubKegiatan}
        onDeleteSubKegiatan={isAdmin ? handleRequestDeleteSubKegiatan : undefined}
        isAdmin={isAdmin}
      />

      {/* Admin Modals */}
      {isAdmin && (
        <ImportExportModal
          isOpen={isImportExportOpen}
          onClose={() => setIsImportExportOpen(false)}
          currentItems={rincianItems}
          activeSubKegiatan={null}
          onApplyDualJson={handleApplyDualJson}
          onResetToDefault={handleResetToDefault}
        />
      )}

      {isAdmin && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          currentUser={appUser}
        />
      )}

      <ConfirmDeleteSubKegiatanModal
        isOpen={Boolean(subKegiatanToDelete)}
        onClose={() => setSubKegiatanToDelete(null)}
        subKegiatan={subKegiatanToDelete}
        onConfirm={handleConfirmDeleteSubKegiatan}
        isDeleting={isDeletingSubKegiatan}
      />

      <FirebaseSyncGuideModal
        isOpen={isFirebaseGuideOpen}
        onClose={() => setIsFirebaseGuideOpen(false)}
        isFirebaseConnected={isFirebaseConnected}
        subKegiatans={subKegiatans}
        rincianItems={rincianItems}
        onSyncComplete={handleRefresh}
      />
    </AppLayout>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
