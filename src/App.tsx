import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from './components/templates/AppLayout';
import { SubKegiatanListPage } from './components/pages/SubKegiatanListPage';
import { SubKegiatanDetailPage } from './components/pages/SubKegiatanDetailPage';
import { LoginPage } from './components/pages/LoginPage';
import { ImportExportModal } from './components/organisms/ImportExportModal';
import { ConfirmDeleteSubKegiatanModal } from './components/organisms/ConfirmDeleteSubKegiatanModal';
import { FirebaseSyncGuideModal } from './components/organisms/FirebaseSyncGuideModal';
import { UserManagementModal } from './components/organisms/UserManagementModal';
import { StandarHargaPage } from './components/pages/StandarHargaPage';
import { getStoredStandarHarga } from './services/standarHargaService';
import {
  testFirestoreConnection,
  subscribeAuth,
  subscribeSubKegiatan,
  subscribeRincianBelanja,
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
  INITIAL_KETERANGAN_LIST,
} from './data/initialBudgetData';
import { BASE_SUB_KEGIATAN_LIST } from './data/initialSubKegiatanData';
import { SubKegiatan, RincianBelanjaItem, KeteranganSubBl, StandarHargaItem } from './types/budget';
import { AppUser } from './types/auth';
import { getCurrentAuthUser, logoutAppUser, getStoredUsers, saveUsers } from './services/authService';
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
          if (!userSaved) return official;

          // Prune stale phantom packages from earlier sessions
          const cleanedKetList = userSaved.keterangan_list
            ? userSaved.keterangan_list.filter((k) => Number(k.id_ket_sub_bl) !== 957928)
            : official.keterangan_list;

          return {
            ...official,
            ...userSaved,
            keterangan_list: cleanedKetList && cleanedKetList.length > 0 ? cleanedKetList : official.keterangan_list,
            pagu_indikatif: official.pagu_indikatif, // Always preserve authentic APBD baseline
            kode_sub_kegiatan: official.kode_sub_kegiatan || userSaved.kode_sub_kegiatan,
            nama_sub_kegiatan: official.nama_sub_kegiatan || userSaved.nama_sub_kegiatan,
            nama_program: official.nama_program || userSaved.nama_program,
            kode_program: official.kode_program || userSaved.kode_program,
            nama_kegiatan: official.nama_kegiatan || official.nama_giat || userSaved.nama_kegiatan,
            kode_kegiatan: official.kode_kegiatan || official.kode_giat || userSaved.kode_kegiatan,
            nama_skpd: official.nama_skpd || official.nama_unit || userSaved.nama_skpd,
            kode_skpd: official.kode_skpd || userSaved.kode_skpd,
            nama_daerah: official.nama_daerah || userSaved.nama_daerah || 'Provinsi Nusa Tenggara Barat',
          };
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
        // Filter out any stale phantom items (e.g. from previously mocked ket 957928) that were not user-added
        const cleaned = parsed.filter(
          (item) => !(Number(item.id_ket_sub_bl) === 957928 && !item.is_user_added)
        );
        return cleaned.map((item) => {
          const matchInitial = INITIAL_USER_RINCIAN_DATA.find((i) => i.id_rinci_sub_bl === item.id_rinci_sub_bl);
          const trueBaseTotal = matchInitial ? matchInitial.total_harga : item.base_total_harga !== undefined ? item.base_total_harga : item.total_harga;
          const trueBaseHarga = matchInitial ? matchInitial.harga_satuan : item.base_harga_satuan !== undefined ? item.base_harga_satuan : item.harga_satuan;
          const trueBaseKoef = matchInitial ? matchInitial.koefisien : item.base_koefisien !== undefined ? item.base_koefisien : item.koefisien;
          const hasUserAdjustment =
            item.user_total_harga !== undefined &&
            item.user_total_harga !== trueBaseTotal;
          const userProposedTotal = hasUserAdjustment ? item.user_total_harga : undefined;

          return {
            ...item,
            total_harga: trueBaseTotal,
            base_total_harga: trueBaseTotal,
            base_harga_satuan: trueBaseHarga,
            base_koefisien: trueBaseKoef,
            user_total_harga: userProposedTotal,
            ket_bl_teks: item.ket_bl_teks || matchInitial?.ket_bl_teks,
            nama_subs_sub_bl: item.nama_subs_sub_bl || matchInitial?.nama_subs_sub_bl,
          };
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
  const [standarHargaList, setStandarHargaList] = useState<StandarHargaItem[]>(() => getStoredStandarHarga());

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

  // Enhanced Sub-Kegiatan list: seamlessly incorporates aggregated totals & Keterangan list from rincianItems
  const enhancedSubKegiatans = useMemo(() => {
    return subKegiatans.map((sub) => {
      const matchingRincian = rincianItems.filter(
        (i) => Number(i.id_sub_bl) === Number(sub.id_sub_bl)
      );

      if (matchingRincian.length > 0) {
        const baseMatch = BASE_SUB_KEGIATAN_LIST.find(
          (b) => Number(b.id_sub_bl) === Number(sub.id_sub_bl)
        );

        // SEBELUM: data dasar murni rincian belanja sebelum ada penyesuaian oleh user
        const totalSebelumRincian = matchingRincian.reduce((acc, curr) => {
          if (curr.is_user_added) return acc;
          const basePrice = curr.base_total_harga !== undefined ? curr.base_total_harga : curr.total_harga || 0;
          return acc + basePrice;
        }, 0);

        // Cek apakah ada penyesuaian / inputan nominal riil oleh user
        const hasUserAdjustment = matchingRincian.some(
          (curr) =>
            (curr.user_total_harga !== undefined &&
              curr.user_total_harga !== (curr.base_total_harga ?? curr.total_harga)) ||
            curr.is_user_added
        );

        // SESUDAH: total setelah penyesuaian nominal (jika tidak ada penyesuaian user, persis sama dengan Sebelum)
        const totalSesudah = hasUserAdjustment
          ? matchingRincian.reduce((acc, curr) => {
              const hasUserAdj = curr.user_total_harga !== undefined || curr.is_user_added;
              const price = hasUserAdj
                ? curr.user_total_harga || 0
                : (curr.base_total_harga ?? curr.total_harga) || 0;
              return acc + price;
            }, 0)
          : totalSebelumRincian;

        // Pagu Indikatif (Sebelum): Selalu tetap dari data dasar murni APBD Murni
        const originalIndikatif =
          baseMatch && baseMatch.pagu_indikatif > 0
            ? baseMatch.pagu_indikatif
            : totalSebelumRincian > 0
            ? totalSebelumRincian
            : sub.pagu_indikatif || 0;

        // Hanya sertakan paket yang memang memiliki item rincian nyata di rincian kegiatan
        const currentKetList = sub.keterangan_list || [];
        const distinctKetIds = Array.from(
          new Set(matchingRincian.map((i) => Number(i.id_ket_sub_bl || 0)).filter((id) => id > 0))
        );

        const targetKetIds = distinctKetIds.length > 0
          ? distinctKetIds
          : currentKetList.map((k) => Number(k.id_ket_sub_bl));

        const updatedKetList = targetKetIds.map((ketId) => {
          const existing = currentKetList.find((k) => Number(k.id_ket_sub_bl) === ketId);
          const ketRincian = matchingRincian.filter(
            (i) => Number(i.id_ket_sub_bl || 0) === ketId
          );
          const hasKetAdj = ketRincian.some(
            (curr) =>
              (curr.user_total_harga !== undefined &&
                curr.user_total_harga !== (curr.base_total_harga ?? curr.total_harga)) ||
              curr.is_user_added
          );

          // Sebelum untuk paket:
          const ketTotalSebelum = ketRincian.reduce((acc, curr) => {
            if (curr.is_user_added) return acc;
            const basePrice = curr.base_total_harga !== undefined ? curr.base_total_harga : curr.total_harga || 0;
            return acc + basePrice;
          }, 0);

          // Sesudah untuk paket:
          const ketTotalSesudah = hasKetAdj
            ? ketRincian.reduce((acc, curr) => {
                const hasUserAdj = curr.user_total_harga !== undefined || curr.is_user_added;
                const price = hasUserAdj
                  ? curr.user_total_harga || 0
                  : (curr.base_total_harga ?? curr.total_harga) || 0;
                return acc + price;
              }, 0)
            : (ketTotalSebelum > 0 ? ketTotalSebelum : (existing?.total_pagu || 0));

          const ketCount = ketRincian.length;
          const sample = ketRincian[0];

          const base = existing || ({
            id_ket_sub_bl: ketId,
            id_sub_bl: sub.id_sub_bl,
            ket_bl_teks: sample?.ket_bl_teks || `Paket Keterangan Belanja #${ketId}`,
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
            total_pagu: ketTotalSebelum > 0 ? ketTotalSebelum : (existing?.total_pagu || 0),
            pagu_sebelum: ketTotalSebelum > 0 ? ketTotalSebelum : (existing?.total_pagu || 0),
            pagu_sesudah: ketTotalSesudah,
            rincian_count: ketCount,
          } as KeteranganSubBl;
        });

        const finalPaguPerubahan = hasUserAdjustment ? totalSesudah : originalIndikatif;

        return {
          ...sub,
          rincian_count: matchingRincian.length,
          total_rincian: finalPaguPerubahan,
          pagu_indikatif: originalIndikatif,
          pagu_perubahan: finalPaguPerubahan,
          keterangan_list: updatedKetList,
        };
      }

      // If no matching items in local/imported state, ensure base 122054 retains initial packages
      if (Number(sub.id_sub_bl) === 122054 && (!sub.keterangan_list || sub.keterangan_list.length === 0)) {
        return {
          ...sub,
          keterangan_list: INITIAL_KETERANGAN_LIST,
          rincian_count: 12,
          total_rincian: 52000000,
          pagu_indikatif: 52000000,
          pagu_perubahan: 52000000,
        };
      }

      return sub;
    });
  }, [subKegiatans, rincianItems]);

  // 1. Firebase Auth listener
  useEffect(() => {
    let isMounted = true;
    const unsubAuth = subscribeAuth((user) => {
      if (isMounted) setCurrentUser(user);
    });
    return () => {
      isMounted = false;
      unsubAuth();
    };
  }, []);

  // 2. Hit API for Sub-Kegiatan data & All Rincian: ONLY when user is logged in AND on /dashboard (or /dasbor)
  const isDashboardRoute =
    Boolean(appUser) &&
    (route.pathname === '/dashboard' ||
      route.pathname === '/dasbor' ||
      (!route.pathname.startsWith('/sub-kegiatan') && route.pathname !== '/' && route.pathname !== ''));

  useEffect(() => {
    if (!isDashboardRoute) return;

    let isMounted = true;
    let unsubSub: (() => void) | null = null;
    let unsubRinciAll: (() => void) | null = null;

    const loadDashboardData = async () => {
      setIsSyncing(true);
      const isConnected = await testFirestoreConnection();
      if (!isMounted) return;
      setIsFirebaseConnected(isConnected);

      if (isConnected) {
        unsubSub = subscribeSubKegiatan(
          (data) => {
            if (isMounted && data.length > 0) {
              setSubKegiatans(data);
              setIsFirebaseConnected(true);
            }
          },
          (err) => console.warn('SubKegiatan sync warning:', err)
        );

        unsubRinciAll = subscribeAllRincianBelanja(
          (data) => {
            if (isMounted && data.length > 0) {
              setRincianItems((prev) => {
                const firestoreIds = new Set(data.map((d) => d.id_rinci_sub_bl));
                const localOnly = prev.filter((p) => !firestoreIds.has(p.id_rinci_sub_bl));
                return [...data, ...localOnly];
              });
              setIsFirebaseConnected(true);
            }
          },
          (err) => console.warn('All rincian sync warning:', err)
        );
      }
      setIsSyncing(false);
    };

    loadDashboardData();

    return () => {
      isMounted = false;
      if (unsubSub) unsubSub();
      if (unsubRinciAll) unsubRinciAll();
    };
  }, [isDashboardRoute]);

  // 3. Hit API for Rincian Belanja: ONLY when on specific sub-kegiatan detail page (/sub-kegiatan/:idSubBl)
  const activeDetailSubId =
    Boolean(appUser) && route.pathname.startsWith('/sub-kegiatan') ? route.params.idSubBl : null;

  useEffect(() => {
    if (!activeDetailSubId) return;

    let isMounted = true;
    let unsubRinci: (() => void) | null = null;

    const loadSubDetailRincian = async () => {
      setIsSyncing(true);
      const isConnected = await testFirestoreConnection();
      if (!isMounted) return;
      setIsFirebaseConnected(isConnected);

      if (isConnected) {
        unsubRinci = subscribeRincianBelanja(
          activeDetailSubId,
          (data) => {
            if (isMounted) {
              setRincianItems((prev) => {
                const otherItems = prev.filter((i) => i.id_sub_bl !== activeDetailSubId);
                return [...data, ...otherItems];
              });
              setIsFirebaseConnected(true);
            }
          },
          (err) => console.warn('Detail rincian sync warning:', err)
        );
      }
      setIsSyncing(false);
    };

    loadSubDetailRincian();

    return () => {
      isMounted = false;
      if (unsubRinci) unsubRinci();
    };
  }, [activeDetailSubId]);

  // Handlers for Login & Logout
  const handleLoginSuccess = (user: AppUser) => {
    setAppUser(user);
    // If user opened a specific URL (e.g. /sub-kegiatan/122054 or /dashboard), preserve it!
    if (route.pathname && route.pathname !== '/' && route.pathname !== '') {
      navigate(route.path);
    } else {
      navigate('/dashboard');
    }
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
      const existingIndex = prev.findIndex((s) => Number(s.id_sub_bl) === Number(mergedSubKegiatan.id_sub_bl));
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = mergedSubKegiatan;
        return copy;
      }
      return [mergedSubKegiatan, ...prev];
    });

    setRincianItems((prev) => {
      const others = prev.filter((i) => Number(i.id_sub_bl) !== Number(mergedSubKegiatan.id_sub_bl));
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
      await forceSyncLocalToFirestore(subKegiatans, rincianItems, getStoredUsers());
    }
    setTimeout(() => {
      setIsSyncing(false);
    }, 600);
  };

  // Active sub-kegiatan lookup for /sub-kegiatan/:idSubBl route
  const activeSubKegiatan = useMemo(() => {
    if (!route.params.idSubBl) return null;
    const targetId = Number(route.params.idSubBl);

    // Look in enhanced state first
    const foundInState = enhancedSubKegiatans.find((s) => Number(s.id_sub_bl) === targetId);
    if (foundInState) return foundInState;

    // Look in official baseline list
    const foundInBase = BASE_SUB_KEGIATAN_LIST.find((s) => Number(s.id_sub_bl) === targetId);
    if (foundInBase) return foundInBase as unknown as SubKegiatan;

    const foundInInit = INITIAL_SUB_KEGIATAN_LIST.find((s) => Number(s.id_sub_bl) === targetId);
    if (foundInInit) return foundInInit;

    return null;
  }, [route.params.idSubBl, enhancedSubKegiatans]);

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
          standarHargaCount={standarHargaList.length}
        >
          <div className="max-w-2xl mx-auto my-8 p-8 sm:p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold">
              404
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                Sub-Kegiatan Tidak Ditemukan
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                URL yang Anda buka meminta ID Sub-Kegiatan <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-emerald-600 dark:text-emerald-400 font-bold">#{route.params.idSubBl || 'Tidak Dikenal'}</code>, yang belum terdaftar pada database APBD TA 2027.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleBackToDashboard}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer shadow-md shadow-emerald-700/20"
              >
                Kembali ke Dashboard
              </button>
              {subKegiatans.length > 0 && (
                <button
                  onClick={() => navigate(`/sub-kegiatan/${subKegiatans[0].id_sub_bl}`)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Buka Sub-Kegiatan #{subKegiatans[0].id_sub_bl}
                </button>
              )}
            </div>

            {subKegiatans.length > 0 && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-left">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Pilih Sub-Kegiatan Tersedia:
                </p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {subKegiatans.slice(0, 5).map((s) => (
                    <button
                      key={s.id_sub_bl}
                      onClick={() => navigate(`/sub-kegiatan/${s.id_sub_bl}`)}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                          {s.nama_sub_kegiatan}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {s.kode_sub_kegiatan} • ID #{s.id_sub_bl}
                        </div>
                      </div>
                      <span className="text-xs text-emerald-600 font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        Buka &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
        standarHargaCount={standarHargaList.length}
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
          standarHargaList={standarHargaList}
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

  // Route 3: "/standar-harga" - Standar Satuan Harga Dedicated Full Page
  if (route.pathname.startsWith('/standar-harga')) {
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
        standarHargaCount={standarHargaList.length}
      >
        <StandarHargaPage
          standarHargaList={standarHargaList}
          onUpdateStandarHargaList={setStandarHargaList}
          isAdmin={isAdmin}
        />

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

        <FirebaseSyncGuideModal
          isOpen={isFirebaseGuideOpen}
          onClose={() => setIsFirebaseGuideOpen(false)}
          isFirebaseConnected={isFirebaseConnected}
          subKegiatans={enhancedSubKegiatans}
          rincianItems={rincianItems}
          onSyncComplete={handleRefresh}
        />
      </AppLayout>
    );
  }

  // Route 4: "/dashboard" or fallback
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
      standarHargaCount={standarHargaList.length}
    >
      <SubKegiatanListPage
        subKegiatans={enhancedSubKegiatans}
        rincianItems={rincianItems}
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
        subKegiatans={enhancedSubKegiatans}
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
