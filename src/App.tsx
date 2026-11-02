import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from './components/templates/AppLayout';
import { SubKegiatanListPage } from './components/pages/SubKegiatanListPage';
import { SubKegiatanDetailPage } from './components/pages/SubKegiatanDetailPage';
import { ImportExportModal } from './components/organisms/ImportExportModal';
import { ConfirmDeleteSubKegiatanModal } from './components/organisms/ConfirmDeleteSubKegiatanModal';
import { FirebaseSyncGuideModal } from './components/organisms/FirebaseSyncGuideModal';
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
import { SubKegiatan, RincianBelanjaItem, KeteranganSubBl, ViewMode } from './types/budget';
import type { User } from 'firebase/auth';

const LOCAL_STORAGE_KEY_RINCIAN = 'sipd_budget_rincian_v1';
const LOCAL_STORAGE_KEY_SUB = 'sipd_budget_sub_kegiatan_v1';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [selectedSubKegiatan, setSelectedSubKegiatan] = useState<SubKegiatan | null>(null);

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
            ? { ...official, ...userSaved, pagu_indikatif: userSaved.pagu_indikatif || official.pagu_indikatif }
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
        // Attach ket_bl_teks and nama_subs_sub_bl if missing
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

  // Auth & Sync status
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [isFirebaseGuideOpen, setIsFirebaseGuideOpen] = useState<boolean>(false);
  const [subKegiatanToDelete, setSubKegiatanToDelete] = useState<SubKegiatan | null>(null);
  const [isDeletingSubKegiatan, setIsDeletingSubKegiatan] = useState<boolean>(false);

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
          const total = matchingRincian.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);

          // Build dynamic list of each id_ket_sub_bl present in rincian
          const currentKetList = sub.keterangan_list || [];
          const distinctKetIds = Array.from(new Set(matchingRincian.map((i) => i.id_ket_sub_bl)));

          const updatedKetList = distinctKetIds.map((ketId) => {
            const existing = currentKetList.find((k) => k.id_ket_sub_bl === ketId);
            const ketRincian = matchingRincian.filter((i) => i.id_ket_sub_bl === ketId);
            const ketTotal = ketRincian.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
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

  // Keep selectedSubKegiatan updated if subKegiatans changes
  useEffect(() => {
    if (selectedSubKegiatan) {
      const fresh = subKegiatans.find((s) => s.id_sub_bl === selectedSubKegiatan.id_sub_bl);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedSubKegiatan)) {
        setSelectedSubKegiatan(fresh);
      }
    }
  }, [subKegiatans, selectedSubKegiatan]);

  // Init Firebase connection and listeners
  useEffect(() => {
    let isMounted = true;

    // Listen to Firebase auth
    const unsubAuth = subscribeAuth((user) => {
      if (isMounted) {
        setCurrentUser(user);
      }
    });

    // Check Firestore connection and seed
    const initFirebase = async () => {
      setIsSyncing(true);
      const isConnected = await testFirestoreConnection();
      if (!isMounted) return;

      setIsFirebaseConnected(isConnected);

      if (isConnected) {
        await seedInitialDataIfEmpty();

        // Subscribe to live sub_kegiatan
        subscribeSubKegiatan(
          (data) => {
            if (isMounted && data.length > 0) {
              setSubKegiatans(data);
              setIsFirebaseConnected(true);
            }
          },
          (err) => console.warn('SubKegiatan sync warning:', err)
        );

        // Subscribe to live all rincian_belanja
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

  // Handlers
  const handleSelectSubKegiatan = (sub: SubKegiatan) => {
    setSelectedSubKegiatan(sub);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToSummary = () => {
    setViewMode('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveItem = async (item: RincianBelanjaItem) => {
    const docId = item.id || `rinci-${item.id_rinci_sub_bl || Date.now()}`;
    const newItem: RincianBelanjaItem = {
      ...item,
      id: docId,
      id_rinci_sub_bl: item.id_rinci_sub_bl || Math.floor(2300000 + Math.random() * 90000),
      id_sub_bl: selectedSubKegiatan?.id_sub_bl || 122054,
      tahun: selectedSubKegiatan?.tahun || 2027,
      id_daerah: selectedSubKegiatan?.id_daerah || 407,
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

    // Save to Firestore if available
    try {
      await saveRincianBelanja(newItem);
    } catch (e) {
      console.warn('Saved locally, Firestore sync deferred:', e);
    }
  };

  const handleDeleteItem = async (item: RincianBelanjaItem) => {
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
    setSubKegiatanToDelete(sub);
  };

  const handleConfirmDeleteSubKegiatan = async (sub: SubKegiatan) => {
    setIsDeletingSubKegiatan(true);
    try {
      // 1. Optimistic local updates: remove matching rincian items
      setRincianItems((prev) => prev.filter((i) => i.id_sub_bl !== sub.id_sub_bl));

      // 2. Remove sub-kegiatan from state
      setSubKegiatans((prev) => prev.filter((s) => s.id !== sub.id && s.id_sub_bl !== sub.id_sub_bl));

      // 3. If currently inspecting this sub-kegiatan, redirect back to summary
      if (selectedSubKegiatan?.id_sub_bl === sub.id_sub_bl) {
        setSelectedSubKegiatan(null);
        setViewMode('summary');
      }

      // 4. Firestore deletion
      await removeSubKegiatan(sub.id, sub.id_sub_bl);
    } catch (e) {
      console.warn('SubKegiatan deleted locally, Firestore sync deferred:', e);
    } finally {
      setIsDeletingSubKegiatan(false);
      setSubKegiatanToDelete(null);
    }
  };

  const handleImportItems = async (newItems: RincianBelanjaItem[]) => {
    setRincianItems(newItems);
    // Push imported items to Firestore
    for (const item of newItems) {
      try {
        await saveRincianBelanja(item);
      } catch (e) {
        console.warn('Import sync error on item:', item.id_rinci_sub_bl, e);
      }
    }
  };

  const handleImportKeterangan = async (ket: KeteranganSubBl) => {
    // Update SubKegiatan with new metadata if applicable
    setSubKegiatans((prev) =>
      prev.map((sub) => {
        if (sub.id_sub_bl === ket.id_sub_bl) {
          return {
            ...sub,
            nama_sub_kegiatan: ket.nama_sub_giat || sub.nama_sub_kegiatan,
            nama_kegiatan: ket.nama_giat || sub.nama_kegiatan,
            nama_program: ket.nama_program || sub.nama_program,
            nama_skpd: ket.nama_skpd || sub.nama_skpd,
            nama_daerah: ket.nama_daerah || sub.nama_daerah,
            id_sub_giat: ket.id_sub_giat,
            id_giat: ket.id_giat,
            id_program: ket.id_program,
            id_skpd: ket.id_skpd,
            id_unit: ket.id_unit,
            keterangan_list: [ket],
          };
        }
        return sub;
      })
    );

    // Update matching rincian items with ket_bl_teks
    setRincianItems((prev) =>
      prev.map((item) =>
        item.id_ket_sub_bl === ket.id_ket_sub_bl || item.id_sub_bl === ket.id_sub_bl
          ? { ...item, ket_bl_teks: ket.ket_bl_teks, id_ket_sub_bl: ket.id_ket_sub_bl }
          : item
      )
    );
  };

  const handleApplyDualJson = async (
    mergedSubKegiatan: SubKegiatan,
    mergedRincian: RincianBelanjaItem[]
  ) => {
    // 1. Update subKegiatans list with new merged data
    setSubKegiatans((prev) => {
      const existingIndex = prev.findIndex((s) => s.id_sub_bl === mergedSubKegiatan.id_sub_bl);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = mergedSubKegiatan;
        return copy;
      }
      return [mergedSubKegiatan, ...prev];
    });

    // 2. Replace or prepend rincian items for this sub-kegiatan
    setRincianItems((prev) => {
      const others = prev.filter((i) => i.id_sub_bl !== mergedSubKegiatan.id_sub_bl);
      return [...mergedRincian, ...others];
    });

    // 3. Navigate directly to this detailed sub-kegiatan view
    setSelectedSubKegiatan(mergedSubKegiatan);
    setViewMode('detail');

    // 4. Background sync to Firestore
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


  // Currently filtered rincian items for active sub-kegiatan
  const currentSubRincianItems = selectedSubKegiatan
    ? rincianItems.filter((i) => i.id_sub_bl === selectedSubKegiatan.id_sub_bl)
    : rincianItems;

  return (
    <AppLayout
      currentUser={currentUser}
      isFirebaseConnected={isFirebaseConnected}
      onOpenImportExport={() => setIsImportExportOpen(true)}
      onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
      onRefreshData={handleRefresh}
      isSyncing={isSyncing}
    >
      {viewMode === 'summary' || !selectedSubKegiatan ? (
        <SubKegiatanListPage
          subKegiatans={subKegiatans}
          onSelectSubKegiatan={handleSelectSubKegiatan}
          onDeleteSubKegiatan={handleRequestDeleteSubKegiatan}
        />
      ) : (
        <SubKegiatanDetailPage
          subKegiatan={selectedSubKegiatan}
          items={currentSubRincianItems}
          onBackToSummary={handleBackToSummary}
          onSaveItem={handleSaveItem}
          onDeleteItem={handleDeleteItem}
          onDeleteSubKegiatan={handleRequestDeleteSubKegiatan}
        />
      )}

      {/* Global Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        currentItems={rincianItems}
        activeSubKegiatan={selectedSubKegiatan}
        onApplyDualJson={handleApplyDualJson}
        onResetToDefault={handleResetToDefault}
      />

      {/* Confirm Delete Sub-Kegiatan Modal */}
      <ConfirmDeleteSubKegiatanModal
        isOpen={Boolean(subKegiatanToDelete)}
        onClose={() => setSubKegiatanToDelete(null)}
        subKegiatan={subKegiatanToDelete}
        onConfirm={handleConfirmDeleteSubKegiatan}
        isDeleting={isDeletingSubKegiatan}
      />

      {/* Firebase & Vercel Sync Guide Modal */}
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
