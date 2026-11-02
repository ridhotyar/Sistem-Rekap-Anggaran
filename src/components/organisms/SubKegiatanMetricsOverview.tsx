import React from 'react';
import { Wallet, Layers, FileSpreadsheet, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { StatCard } from '../molecules/StatCard';
import { CurrencyText } from '../atoms/CurrencyText';
import { RincianBelanjaItem, SubKegiatan } from '../../types/budget';

export interface SubKegiatanMetricsOverviewProps {
  subKegiatan?: SubKegiatan;
  items: RincianBelanjaItem[];
  allSubKegiatans?: SubKegiatan[];
  isDetailedView?: boolean;
}

export const SubKegiatanMetricsOverview: React.FC<SubKegiatanMetricsOverviewProps> = ({
  subKegiatan,
  items,
  allSubKegiatans,
  isDetailedView = false,
}) => {
  // If in detailed view, calculate metrics for this sub-kegiatan
  if (isDetailedView && subKegiatan) {
    const totalRincian = items.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
    const uniqueAccounts = new Set(items.map((i) => i.kode_akun)).size;
    const pagu = subKegiatan.pagu_indikatif || totalRincian;
    const balance = pagu - totalRincian;

    // Largest expenditure item
    const maxItem = items.length > 0
      ? items.reduce((prev, curr) => (curr.total_harga > prev.total_harga ? curr : prev), items[0])
      : null;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Pagu Sub-Kegiatan"
          value={<CurrencyText amount={pagu} />}
          subtitle={`Tahun Anggaran ${subKegiatan.tahun}`}
          icon={<Wallet className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        />

        <StatCard
          title="Total Rincian Dibelanjakan"
          value={<CurrencyText amount={totalRincian} />}
          subtitle={
            balance === 0
              ? 'Pagu seimbang (100% teralokasi)'
              : balance > 0
              ? `Sisa pagu: ${balance.toLocaleString('id-ID')}`
              : 'Melebihi pagu indikatif'
          }
          icon={<FileSpreadsheet className="w-5 h-5" />}
          iconBgColor="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
          trend={{
            label: `${items.length} Rincian Item`,
            isPositive: balance >= 0,
          }}
        />

        <StatCard
          title="Jumlah Rekening Akun"
          value={`${uniqueAccounts} Rekening`}
          subtitle="Kode Rekening Belanja Daerah"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        />

        <StatCard
          title="Alokasi Terbesar"
          value={maxItem ? <CurrencyText amount={maxItem.total_harga} compact /> : 'Rp 0'}
          subtitle={maxItem ? maxItem.spek : 'Tidak ada rincian'}
          icon={<ArrowUpRight className="w-5 h-5" />}
          iconBgColor="bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
        />
      </div>
    );
  }

  // Summary list view metrics
  const totalSubKegiatanCount = allSubKegiatans?.length || 0;
  const totalPaguOverall = allSubKegiatans?.reduce((acc, curr) => acc + (curr.pagu_indikatif || 0), 0) || 0;
  const totalItemsOverall = allSubKegiatans?.reduce((acc, curr) => acc + (curr.rincian_count || 0), 0) || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <StatCard
        title="Total Sub-Kegiatan Terdaftar"
        value={`${totalSubKegiatanCount} Sub-Kegiatan`}
        subtitle="Klasifikasi Program & Kegiatan"
        icon={<Layers className="w-5 h-5" />}
        iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
      />

      <StatCard
        title="Total Pagu Anggaran Daerah"
        value={<CurrencyText amount={totalPaguOverall} />}
        subtitle="Alokasi APBD Murni TA 2027"
        icon={<Wallet className="w-5 h-5" />}
        iconBgColor="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
      />

      <StatCard
        title="Total Item Rincian Belanja"
        value={`${totalItemsOverall} Item Belanja`}
        subtitle="Standar Satuan Harga (SSH/ASB)"
        icon={<CheckCircle2 className="w-5 h-5" />}
        iconBgColor="bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400"
      />
    </div>
  );
};
