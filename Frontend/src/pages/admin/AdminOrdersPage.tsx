import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Download,
  Eye,
  PlusCircle,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/ui/Badges';
import { OrderTimeline } from '../../components/ui/DataDisplay';
import { EmptyState, Modal } from '../../components/ui/Feedback';
import {
  Button,
  DatePicker,
  Select,
  Textarea,
} from '../../components/ui/FormControls';
import { triggerDownloadNotaHtml } from '../../utils/notaDownload';
import { type StockShortage, useApp } from '../../context/AppContext';
import type { Order, OrderStatus } from '../../types/domain';
import {
  formatRupiah,
  formatStockNumber,
  formatTanggalIndonesia,
  formatWaktuWib,
  getTodayWibDate,
} from '../../utils/format';

const NEXT_STAGE_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
  'Pesanan Baru': 'Mulai Dimasak',
  'Mulai Dimasak': 'Sedang Dipacking',
  'Sedang Dipacking': 'Siap Diambil',
  'Siap Diambil': 'Pesanan Selesai',
};

export const AdminOrdersPage: React.FC = () => {
  const {
    orders,
    payments,
    getVerifiedPaidAmount,
    getRemainingBalance,
    advanceOrderStatus,
    cancelOrderByAdmin,
  } = useApp();
  const navigate = useNavigate();

  const todayIso = getTodayWibDate();
  const [dateFilter, setDateFilter] = useState(todayIso);
  const [showAllDates, setShowAllDates] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Semua' | OrderStatus>(
    'Semua'
  );

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [shortages, setShortages] = useState<StockShortage[]>([]);
  const [statusError, setStatusError] = useState('');

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!showAllDates && dateFilter && o.tanggalAcara !== dateFilter) {
        return false;
      }
      if (statusFilter !== 'Semua' && o.statusPesanan !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [orders, showAllDates, dateFilter, statusFilter]);

  const selectedOrder: Order | undefined = useMemo(
    () => orders.find((o) => o.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  const openDetail = (order: Order) => {
    setSelectedOrderId(order.id);
    setShortages([]);
    setStatusError('');
  };

  const handleAdvance = (orderId: number) => {
    setShortages([]);
    setStatusError('');
    const res = advanceOrderStatus(orderId);
    if (!res.ok) {
      setStatusError(res.error || 'Gagal memperbarui status.');
      if (res.shortages) setShortages(res.shortages);
    }
  };

  const getCancellationImpacts = (order: Order) => {
    const pendingPayCount = payments.filter(
      (p) => p.pesananId === order.id && p.status === 'Menunggu Verifikasi'
    ).length;
    const verifiedPaid = getVerifiedPaidAmount(order.id);
    const willRestock =
      order.stokSudahDipotong &&
      (order.statusPesanan === 'Mulai Dimasak' ||
        order.statusPesanan === 'Sedang Dipacking' ||
        order.statusPesanan === 'Siap Diambil');

    return { pendingPayCount, verifiedPaid, willRestock };
  };

  const handleConfirmCancel = () => {
    if (!selectedOrder) return;
    if (!cancelReason.trim()) {
      setCancelError('Alasan pembatalan wajib diisi.');
      return;
    }
    const res = cancelOrderByAdmin(selectedOrder.id, cancelReason);
    if (!res.ok) {
      setCancelError(res.error || 'Gagal membatalkan pesanan.');
      return;
    }
    setCancelOpen(false);
    setCancelReason('');
    setCancelError('');
  };

  return (
    <AdminLayout
      title="Daftar Pesanan &amp; Proses Produksi"
      subtitle="Kelola tahapan pesanan satu tahap demi satu tahap sesuai status pembayaran dan stok."
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/pesan?kanal=datang-langsung')}
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Buat Pesanan Pelanggan Datang
        </Button>
      }
    >
      {/* Filters */}
      <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-4">
            <DatePicker
              id="filter-tanggal-pesanan"
              label="Tanggal Acara"
              value={dateFilter}
              disabled={showAllDates}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="sm:col-span-4">
            <Select
              id="filter-status-pesanan"
              label="Status Pesanan"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'Semua' | OrderStatus)
              }
            >
              <option value="Semua">Semua Status</option>
              <option value="Menunggu DP">Menunggu DP</option>
              <option value="Pesanan Baru">Pesanan Baru</option>
              <option value="Mulai Dimasak">Mulai Dimasak</option>
              <option value="Sedang Dipacking">Sedang Dipacking</option>
              <option value="Siap Diambil">Siap Diambil</option>
              <option value="Pesanan Selesai">Pesanan Selesai</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </Select>
          </div>
          <div className="sm:col-span-4 flex flex-wrap items-center gap-3 pb-1">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#243128] cursor-pointer">
              <input
                type="checkbox"
                checked={showAllDates}
                onChange={(e) => setShowAllDates(e.target.checked)}
                className="h-4 w-4 accent-[#245C3D]"
              />
              <span>Tampilkan semua tanggal</span>
            </label>
          </div>
        </div>
      </section>

      {/* Orders Table / Mobile List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="Tidak ada pesanan pada filter ini"
          description="Coba ubah tanggal acara atau tampilkan seluruh tanggal untuk melihat pesanan lain."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setShowAllDates(true);
                setStatusFilter('Semua');
              }}
            >
              Tampilkan Semua Pesanan
            </Button>
          }
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-[#EEF5EC] text-xs font-semibold text-[#243128]">
                <tr>
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Pelanggan</th>
                  <th className="px-4 py-3 text-left">Paket</th>
                  <th className="px-4 py-3 text-right">Porsi</th>
                  <th className="px-4 py-3 text-left">Tanggal / Waktu Acara</th>
                  <th className="px-4 py-3 text-left">Kanal</th>
                  <th className="px-4 py-3 text-left">Status Pesanan</th>
                  <th className="px-4 py-3 text-left">Pembayaran</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EC]">
                {filteredOrders.map((o) => {
                  const totalPorsi = o.items.reduce(
                    (s, it) => s + it.jumlahPorsi,
                    0
                  );
                  const pendingPel = payments.some(
                    (p) =>
                      p.pesananId === o.id &&
                      p.jenis === 'Pelunasan' &&
                      p.status === 'Menunggu Verifikasi'
                  );
                  return (
                    <tr key={o.id} className="hover:bg-[#F5F7F4]/70">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#245C3D]">
                        {o.kodePesanan}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#243128]">
                          {o.namaPelanggan}
                        </p>
                        <p className="text-xs text-[#55645A]">{o.noKontak}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#243128]">
                        {o.items.map((it) => it.namaProduk).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {totalPorsi}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium text-[#243128]">
                          {formatTanggalIndonesia(o.tanggalAcara)}
                        </p>
                        <p className="text-[#55645A]">
                          {formatWaktuWib(o.waktuAcara)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[#243128]">
                        {o.kanal}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={o.statusPesanan} />
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge
                          status={o.statusPembayaran}
                          hasPendingPelunasan={pendingPel}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(o)}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Order Detail Modal / Drawer */}
      <Modal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrderId(null)}
        title={
          selectedOrder
            ? `Detail Pesanan ${selectedOrder.kodePesanan}`
            : 'Detail Pesanan'
        }
        maxWidthClass="max-w-2xl"
      >
        {selectedOrder && (() => {
          const paid = getVerifiedPaidAmount(selectedOrder.id);
          const remaining = getRemainingBalance(selectedOrder);
          const nextStage = NEXT_STAGE_MAP[selectedOrder.statusPesanan];
          const canCancel =
            selectedOrder.statusPesanan !== 'Pesanan Selesai' &&
            selectedOrder.statusPesanan !== 'Dibatalkan';
          const pendingPel = payments.some(
            (p) =>
              p.pesananId === selectedOrder.id &&
              p.jenis === 'Pelunasan' &&
              p.status === 'Menunggu Verifikasi'
          );

          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F5F7F4] p-4">
                <div>
                  <p className="text-xs text-[#55645A]">
                    {selectedOrder.nomorNota} • {selectedOrder.kanal}
                  </p>
                  <p className="text-base font-bold text-[#243128]">
                    {selectedOrder.namaPelanggan} ({selectedOrder.noKontak})
                  </p>
                  <p className="text-xs text-[#55645A]">
                    Acara: {formatTanggalIndonesia(selectedOrder.tanggalAcara, true)} •{' '}
                    {formatWaktuWib(selectedOrder.waktuAcara)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <OrderStatusBadge status={selectedOrder.statusPesanan} />
                  <PaymentStatusBadge
                    status={selectedOrder.statusPembayaran}
                    hasPendingPelunasan={pendingPel}
                  />
                </div>
              </div>

              {statusError && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-sm text-[#B42318] space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      className="mt-0.5 h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-bold">{statusError}</p>
                      {shortages.length > 0 && (
                        <p className="mt-0.5 text-xs text-[#7A271A]">
                          Status pesanan tetap dipertahankan. Rincian kekurangan
                          stok:
                        </p>
                      )}
                    </div>
                  </div>

                  {shortages.length > 0 && (
                    <div className="space-y-2">
                      <ul className="space-y-1 rounded-lg bg-white p-3 text-xs text-[#243128]">
                        {shortages.map((s) => (
                          <li
                            key={s.itemId}
                            className="flex justify-between gap-2"
                          >
                            <span className="font-semibold">{s.nama}</span>
                            <span>
                              Butuh {formatStockNumber(s.dibutuhkan)} {s.satuan},
                              tersedia {formatStockNumber(s.tersedia)} {s.satuan}{' '}
                              <strong className="text-[#B42318]">
                                (Kurang {formatStockNumber(s.kekurangan)}{' '}
                                {s.satuan})
                              </strong>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/admin/stok"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#245C3D] hover:underline"
                      >
                        Buka Kelola Stok untuk menambah stok →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-[#DCE5DA] p-4 space-y-2 text-sm">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {it.namaProduk} ({it.jumlahPorsi} porsi)
                    </span>
                    <span className="font-semibold">
                      {formatRupiah(it.subtotal)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-[#EEF2EC] pt-2 flex justify-between font-bold">
                  <span>Total Tagihan</span>
                  <span>{formatRupiah(selectedOrder.totalHarga)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#55645A]">
                  <span>Sudah Diterima</span>
                  <span className="font-semibold text-[#137333]">
                    {formatRupiah(paid)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-[#245C3D]">
                  <span>Sisa Pembayaran Saat Ini</span>
                  <span>{formatRupiah(remaining)}</span>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-[#243128]">
                  Riwayat Tahapan
                </h3>
                <OrderTimeline order={selectedOrder} />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF2EC] pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerDownloadNotaHtml(selectedOrder, paid)}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Unduh Nota
                  </Button>
                  {canCancel && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setCancelReason('');
                        setCancelError('');
                        setCancelOpen(true);
                      }}
                    >
                      <Ban className="h-4 w-4" aria-hidden="true" />
                      Batalkan Pesanan
                    </Button>
                  )}
                </div>

                {nextStage ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAdvance(selectedOrder.id)}
                  >
                    Lanjut ke: {nextStage}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : selectedOrder.statusPesanan === 'Menunggu DP' ? (
                  <Link
                    to="/admin/pembayaran"
                    className="text-xs font-semibold text-[#245C3D] hover:underline"
                  >
                    Verifikasi DP di menu Pembayaran →
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Cancel Modal with Explicit Conditional Impacts */}
      <Modal
        open={cancelOpen && Boolean(selectedOrder)}
        onClose={() => setCancelOpen(false)}
        title="Konfirmasi Pembatalan Pesanan"
        maxWidthClass="max-w-lg"
      >
        {selectedOrder && (() => {
          const impact = getCancellationImpacts(selectedOrder);
          return (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#F3D88C] bg-[#FEF7E0] p-4 text-xs text-[#243128] space-y-1.5">
                <p className="font-bold text-[#855800]">
                  Dampak Pembatalan untuk Kondisi Pesanan Ini:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    {impact.willRestock
                      ? 'Stok bahan dan kemasan akan dikembalikan karena pesanan sudah memasuki tahap produksi.'
                      : 'Tidak ada pengembalian stok karena pesanan belum memasuki tahap produksi.'}
                  </li>
                  <li>
                    {impact.pendingPayCount > 0
                      ? `${impact.pendingPayCount} unggahan pembayaran yang masih menunggu verifikasi akan diubah menjadi VOID.`
                      : 'Tidak ada pembayaran menunggu verifikasi yang perlu di-VOID.'}
                  </li>
                  <li>
                    Pembayaran yang sudah diterima ({formatRupiah(impact.verifiedPaid)}) tetap tercatat sebagai penerimaan historis; tidak ada refund otomatis oleh sistem.
                  </li>
                </ul>
              </div>

              <Textarea
                id="cancel-alasan"
                label="Alasan Pembatalan"
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Tuliskan alasan pembatalan pesanan..."
                error={cancelError}
              />

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCancelOpen(false)}>
                  Kembali
                </Button>
                <Button variant="danger" onClick={handleConfirmCancel}>
                  Konfirmasi Pembatalan
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </AdminLayout>
  );
};
