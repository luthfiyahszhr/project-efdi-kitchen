import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  CreditCard,
  Info,
  Package,
  PlusCircle,
  Settings,
  Users,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StoreStatusBanner } from '../../components/ui/Badges';
import { Button } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import {
  formatStockNumber,
  formatTanggalIndonesia,
  getTodayWibDate,
  getWibParts,
} from '../../utils/format';

export const AdminDashboardPage: React.FC = () => {
  const {
    currentUser,
    effectiveStoreStatus,
    inventory,
    orders,
    payments,
    simulateSessionExpired,
  } = useApp();
  const navigate = useNavigate();

  const wib = getWibParts(new Date());
  const todayIso = getTodayWibDate();
  const isOwner = currentUser?.role === 'Owner';

  const lowStockItems = useMemo(
    () =>
      inventory.filter(
        (i) => i.batasMinimum !== null && i.stok <= i.batasMinimum
      ),
    [inventory]
  );

  const unsetMinItems = useMemo(
    () => inventory.filter((i) => i.batasMinimum === null),
    [inventory]
  );

  const todayOrdersCount = orders.filter(
    (o) => o.tanggalAcara === todayIso && o.statusPesanan !== 'Dibatalkan'
  ).length;
  const newOrdersCount = orders.filter(
    (o) => o.statusPesanan === 'Pesanan Baru'
  ).length;
  const pendingPaymentsCount = payments.filter(
    (p) => p.status === 'Menunggu Verifikasi'
  ).length;

  const shortcuts = [
    {
      to: '/admin/pesanan',
      label: 'Daftar Pesanan',
      desc: `${todayOrdersCount} pesanan aktif hari ini`,
      icon: ClipboardList,
    },
    {
      to: '/admin/pembayaran',
      label: 'Verifikasi Pembayaran',
      desc: `${pendingPaymentsCount} menunggu verifikasi`,
      icon: CreditCard,
    },
    {
      to: '/admin/kebutuhan',
      label: 'Kebutuhan Produksi',
      desc: `${newOrdersCount} pesanan baru siap hitung`,
      icon: ChefHat,
    },
    {
      to: '/admin/stok',
      label: 'Kelola Stok',
      desc: `${lowStockItems.length} item stok menipis`,
      icon: Boxes,
    },
    {
      to: '/admin/produk',
      label: 'Kelola Katalog',
      desc: 'Paket & komposisi per porsi',
      icon: Package,
    },
    {
      to: '/admin/pengaturan',
      label: 'Pengaturan Operasional',
      desc: 'Jadwal & mode pemesanan',
      icon: Settings,
    },
    {
      to: '/admin/customer',
      label: 'Akun Customer',
      desc: 'Daftar & reset password',
      icon: Users,
    },
    ...(isOwner
      ? [
          {
            to: '/admin/laporan',
            label: 'Rekap Laporan Transaksi',
            desc: 'Penjualan, penerimaan & piutang',
            icon: BarChart3,
          },
        ]
      : []),
  ];

  return (
    <AdminLayout
      title="Dashboard Operasional"
      subtitle={`${formatTanggalIndonesia(todayIso, true)} • ${wib.timeShort} WIB`}
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/pesan?kanal=datang-langsung')}
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Pesanan Datang Langsung
        </Button>
      }
    >
      {/* Greeting Card */}
      <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#245C3D]">
              Halo, {currentUser?.namaLengkap} ({currentUser?.role})
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#243128]">
              Ringkasan Operasional Efdi Kitchen
            </h2>
            <p className="mt-0.5 text-sm text-[#55645A]">
              Tanggal saat ini: {formatTanggalIndonesia(todayIso, true)}, pukul{' '}
              {wib.timeShort} WIB
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/pengaturan')}
            >
              Atur Jam Buka/Tutup
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={simulateSessionExpired}
              title="Uji simulasi sesi berakhir setelah 60 menit tidak aktif"
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              Simulasi Sesi Habis
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <StoreStatusBanner status={effectiveStoreStatus} compact />
        </div>
      </section>

      {/* Low Stock Warnings + Unset Minimum Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 border-b border-[#EEF2EC] pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-5 w-5 text-[#9A6700]"
                aria-hidden="true"
              />
              <h2 className="text-base font-bold text-[#243128]">
                Peringatan Stok Menipis
              </h2>
            </div>
            <Link
              to="/admin/stok"
              className="text-xs font-semibold text-[#245C3D] hover:underline"
            >
              Kelola Stok →
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#EEF5EC] p-4 text-sm text-[#245C3D]">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>
                Seluruh bahan dan kemasan yang memiliki batas minimum berada
                dalam jumlah aman.
              </span>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F7F4] text-xs text-[#55645A]">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Item
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Tipe
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Stok Saat Ini
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Batas Minimum
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EC]">
                  {lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-semibold text-[#243128]">
                        {item.nama}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#55645A]">
                        {item.tipe}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-[#B42318]">
                        {formatStockNumber(item.stok)} {item.satuan}
                      </td>
                      <td className="px-3 py-3 text-right text-[#55645A]">
                        {item.batasMinimum !== null
                          ? `${formatStockNumber(item.batasMinimum)} ${item.satuan}`
                          : 'Belum diatur'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Informational Unset Thresholds */}
        <section className="lg:col-span-5 rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 border-b border-[#EEF2EC] pb-4">
            <Info className="h-5 w-5 text-[#245C3D]" aria-hidden="true" />
            <h2 className="text-base font-bold text-[#243128]">
              Batas Minimum Belum Diatur
            </h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#55645A]">
            Item berikut belum memiliki batas minimum sehingga bersifat
            informasional dan tidak dikelompokkan sebagai stok menipis.
          </p>

          {unsetMinItems.length === 0 ? (
            <p className="mt-4 text-sm text-[#55645A]">
              Semua item sudah memiliki batas minimum.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {unsetMinItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#EEF2EC] bg-[#F5F7F4] px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-semibold text-[#243128]">{item.nama}</p>
                    <p className="text-xs text-[#55645A]">
                      Stok: {formatStockNumber(item.stok)} {item.satuan}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#CBD6C8] bg-white px-2.5 py-0.5 text-xs font-medium text-[#55645A]">
                    Belum diatur
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Module Shortcuts */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#243128]">
          Navigasi Modul Operasional
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((sc) => {
            const Icon = sc.icon;
            return (
              <Link
                key={sc.to}
                to={sc.to}
                className="group flex flex-col justify-between rounded-2xl border border-[#DCE5DA] bg-white p-5 transition-colors hover:border-[#245C3D] hover:bg-[#EEF5EC]/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF5EC] text-[#245C3D] group-hover:bg-[#245C3D] group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="h-4 w-4 text-[#55645A] group-hover:text-[#245C3D]"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-[#243128]">
                    {sc.label}
                  </h3>
                  <p className="mt-1 text-xs text-[#55645A]">{sc.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AdminLayout>
  );
};
