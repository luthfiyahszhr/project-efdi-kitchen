import React, { useMemo, useState } from 'react';
import { BarChart3, Info } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/ui/Badges';
import { EmptyState } from '../../components/ui/Feedback';
import { DatePicker } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import {
  formatRupiah,
  formatTanggalIndonesia,
  getTodayWibDate,
  getWibParts,
} from '../../utils/format';

export const AdminReportsPage: React.FC = () => {
  const { currentUser, orders, payments, getRemainingBalance } = useApp();

  const todayIso = getTodayWibDate();
  const currentMonth = todayIso.slice(0, 7);

  const [periodType, setPeriodType] = useState<'Harian' | 'Bulanan'>('Bulanan');
  const [selectedDay, setSelectedDay] = useState(todayIso);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const matchesPeriod = (isoOrTimestamp?: string) => {
    if (!isoOrTimestamp) return false;
    const datePart = /^\d{4}-\d{2}-\d{2}$/.test(isoOrTimestamp)
      ? isoOrTimestamp
      : getWibParts(isoOrTimestamp).isoDate;
    if (periodType === 'Harian') return datePart === selectedDay;
    return datePart.slice(0, 7) === selectedMonth;
  };

  const reportData = useMemo(() => {
    // 1. Total Penjualan: Pesanan Selesai berdasarkan tanggal selesai
    const completedOrders = orders.filter(
      (o) =>
        o.statusPesanan === 'Pesanan Selesai' &&
        matchesPeriod(o.selesaiPada ?? o.tanggalAcara)
    );
    const totalPenjualan = completedOrders.reduce(
      (s, o) => s + o.totalHarga,
      0
    );

    // 2. Total Diterima: Pembayaran Diterima berdasarkan tanggal verifikasi
    //    (termasuk pembayaran diterima dari pesanan yang kemudian dibatalkan!)
    const acceptedPayments = payments.filter(
      (p) =>
        p.status === 'Diterima' &&
        matchesPeriod(p.diverifikasiPada ?? p.waktuUnggah)
    );
    const totalDiterima = acceptedPayments.reduce((s, p) => s + p.nominal, 0);

    // 3. Piutang: Saldo pesanan belum lunas & tidak dibatalkan berdasarkan tanggal acara
    const receivableOrders = orders.filter(
      (o) =>
        o.statusPesanan !== 'Dibatalkan' &&
        o.statusPembayaran !== 'Lunas' &&
        matchesPeriod(o.tanggalAcara)
    );
    const totalPiutang = receivableOrders.reduce(
      (s, o) => s + getRemainingBalance(o),
      0
    );

    // Table rows: orders relevant to the period (by event date, completion date, or verified payment date)
    const paymentOrderIds = new Set(acceptedPayments.map((p) => p.pesananId));
    const tableOrders = orders.filter(
      (o) =>
        matchesPeriod(o.tanggalAcara) ||
        (o.statusPesanan === 'Pesanan Selesai' &&
          matchesPeriod(o.selesaiPada)) ||
        paymentOrderIds.has(o.id)
    );

    return {
      jumlahPesanan: tableOrders.length,
      totalPenjualan,
      totalDiterima,
      totalPiutang,
      tableOrders,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, payments, periodType, selectedDay, selectedMonth, getRemainingBalance]);

  if (currentUser?.role !== 'Owner') {
    return (
      <AdminLayout title="Rekap Laporan Transaksi">
        <EmptyState
          title="Akses Terbatas untuk Owner"
          description="Halaman Rekap Laporan Transaksi hanya dapat diakses oleh akun Owner."
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Rekap Laporan Transaksi"
      subtitle="Ringkasan baca-saja penjualan, penerimaan pembayaran terverifikasi, dan piutang (tanpa tanggal masa depan)."
    >
      {/* Period Selector */}
      <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-1.5 text-sm font-semibold text-[#243128]">
                Periode Laporan
              </p>
              <div className="inline-flex rounded-[10px] border border-[#CBD6C8] bg-[#F5F7F4] p-1">
                {(['Harian', 'Bulanan'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodType(p)}
                    className={`min-h-[36px] rounded-lg px-4 text-xs font-bold cursor-pointer ${
                      periodType === p
                        ? 'bg-[#245C3D] text-white'
                        : 'text-[#243128]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {periodType === 'Harian' ? (
              <div className="w-56">
                <DatePicker
                  id="laporan-harian"
                  label="Pilih Tanggal (Maks. Hari Ini)"
                  max={todayIso}
                  value={selectedDay}
                  onChange={(e) => {
                    if (e.target.value <= todayIso) {
                      setSelectedDay(e.target.value);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 w-56">
                <label
                  htmlFor="laporan-bulanan"
                  className="text-sm font-semibold text-[#243128]"
                >
                  Pilih Bulan (Maks. Bulan Ini)
                </label>
                <input
                  id="laporan-bulanan"
                  type="month"
                  max={currentMonth}
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value <= currentMonth) {
                      setSelectedMonth(e.target.value);
                    }
                  }}
                  className="min-h-[44px] rounded-[10px] border border-[#CBD6C8] bg-white px-3.5 text-sm text-[#243128]"
                />
              </div>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF5EC] px-3 py-1 text-xs font-semibold text-[#245C3D]">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            Mode Baca-Saja (Owner)
          </span>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#DCE5DA] bg-white p-5">
          <p className="text-xs font-semibold text-[#55645A]">Jumlah Pesanan</p>
          <p className="mt-2 text-2xl font-bold text-[#243128]">
            {reportData.jumlahPesanan}
          </p>
          <p className="mt-1 text-[11px] text-[#55645A]">
            Terkait periode terpilih
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE5DA] bg-white p-5">
          <p className="text-xs font-semibold text-[#55645A]">
            Total Penjualan
          </p>
          <p className="mt-2 text-2xl font-bold text-[#245C3D]">
            {formatRupiah(reportData.totalPenjualan)}
          </p>
          <p className="mt-1 text-[11px] text-[#55645A]">
            Pesanan Selesai berdasar tanggal selesai
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE5DA] bg-white p-5">
          <p className="text-xs font-semibold text-[#55645A]">Total Diterima</p>
          <p className="mt-2 text-2xl font-bold text-[#137333]">
            {formatRupiah(reportData.totalDiterima)}
          </p>
          <p className="mt-1 text-[11px] text-[#55645A]">
            Pembayaran Diterima berdasar tanggal verifikasi
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE5DA] bg-white p-5">
          <p className="text-xs font-semibold text-[#55645A]">Piutang</p>
          <p className="mt-2 text-2xl font-bold text-[#855800]">
            {formatRupiah(reportData.totalPiutang)}
          </p>
          <p className="mt-1 text-[11px] text-[#55645A]">
            Saldo pesanan belum lunas &amp; aktif berdasar tanggal acara
          </p>
        </div>
      </section>

      <div className="flex items-start gap-2.5 rounded-xl border border-[#C5DEC1] bg-[#EEF5EC] p-3.5 text-xs text-[#243128]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#245C3D]" aria-hidden="true" />
        <span>
          Pembayaran yang telah diverifikasi Diterima dari pesanan yang kemudian
          dibatalkan tetap tercatat pada <strong>Total Diterima</strong> sebagai
          penerimaan historis. Laporan ini tidak menghitung laba bersih karena
          data biaya usaha tidak dikelola pada sistem ini.
        </span>
      </div>

      {/* Transactions Table */}
      {reportData.tableOrders.length === 0 ? (
        <EmptyState
          title="Tidak ada transaksi pada periode ini"
          description="Pilih tanggal atau bulan lain untuk melihat rekap transaksi."
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[#EEF5EC] text-xs font-semibold text-[#243128]">
                <tr>
                  <th className="px-4 py-3 text-left">Kode Pesanan</th>
                  <th className="px-4 py-3 text-left">Tanggal Acara</th>
                  <th className="px-4 py-3 text-left">Pelanggan</th>
                  <th className="px-4 py-3 text-left">Status Pesanan</th>
                  <th className="px-4 py-3 text-left">Status Pembayaran</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EC]">
                {reportData.tableOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#245C3D]">
                      {o.kodePesanan}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#243128]">
                      {formatTanggalIndonesia(o.tanggalAcara)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#243128]">
                      {o.namaPelanggan}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.statusPesanan} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={o.statusPembayaran} />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#243128]">
                      {formatRupiah(o.totalHarga)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AdminLayout>
  );
};
