import React, { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Eye,
  Info,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { PaymentRecordBadge } from '../../components/ui/Badges';
import { EmptyState, Modal } from '../../components/ui/Feedback';
import {
  Button,
  Input,
  Select,
  Textarea,
} from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import type { PaymentRecord, PaymentRecordStatus, PaymentType } from '../../types/domain';
import { formatRupiah, formatTanggalWaktuWib } from '../../utils/format';

export const AdminPaymentsPage: React.FC = () => {
  const {
    payments,
    orders,
    getVerifiedPaidAmount,
    getRemainingBalance,
    verifyPayment,
    recordCashPayment,
  } = useApp();

  const [tab, setTab] = useState<'Menunggu Verifikasi' | 'Semua'>(
    'Menunggu Verifikasi'
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Walk-in cash form state
  const walkInOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.kanal === 'Datang Langsung' &&
          o.statusPesanan !== 'Dibatalkan' &&
          o.statusPembayaran !== 'Lunas'
      ),
    [orders]
  );
  const [cashOrderId, setCashOrderId] = useState<number>(() => walkInOrders[0]?.id ?? 0);
  const [cashJenis, setCashJenis] = useState<PaymentType>('DP');
  const [cashNominal, setCashNominal] = useState('');
  const [cashError, setCashError] = useState('');

  const filteredPayments = useMemo(() => {
    if (tab === 'Menunggu Verifikasi') {
      return payments.filter((p) => p.status === 'Menunggu Verifikasi');
    }
    return payments;
  }, [payments, tab]);

  const selectedPayment: PaymentRecord | undefined = useMemo(
    () =>
      payments.find((p) => p.id === selectedId) ??
      filteredPayments[0],
    [payments, selectedId, filteredPayments]
  );

  const selectedOrder = selectedPayment
    ? orders.find((o) => o.id === selectedPayment.pesananId)
    : undefined;

  const selectedCashOrder = walkInOrders.find((o) => o.id === Number(cashOrderId));

  const handleApprove = () => {
    if (!selectedPayment) return;
    verifyPayment({ paymentId: selectedPayment.id, approved: true });
  };

  const handleReject = () => {
    if (!selectedPayment) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError('Alasan penolakan wajib diisi.');
      return;
    }
    if (trimmed.length > 255) {
      setRejectError('Alasan penolakan maksimal 255 karakter.');
      return;
    }
    const res = verifyPayment({
      paymentId: selectedPayment.id,
      approved: false,
      alasanPenolakan: trimmed,
    });
    if (!res.ok) {
      setRejectError(res.error || 'Gagal menolak pembayaran.');
      return;
    }
    setRejectOpen(false);
    setRejectReason('');
    setRejectError('');
  };

  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCashError('');
    if (!selectedCashOrder) {
      setCashError('Pilih pesanan Datang Langsung terlebih dahulu.');
      return;
    }
    const nominal = Number(cashNominal);
    const res = recordCashPayment({
      orderId: selectedCashOrder.id,
      jenis: cashJenis,
      nominal,
    });
    if (!res.ok) {
      setCashError(res.error || 'Gagal mencatat pembayaran tunai.');
      return;
    }
    setCashNominal('');
  };

  const statusBadgeCount = (st: PaymentRecordStatus) =>
    payments.filter((p) => p.status === st).length;

  return (
    <AdminLayout
      title="Verifikasi Pembayaran Manual"
      subtitle="Cocokkan bukti unggahan pelanggan dengan mutasi dana masuk secara manual."
    >
      {/* Manual Matching Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#C5DEC1] bg-[#EEF5EC] p-4 text-sm text-[#243128]">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#245C3D]" aria-hidden="true" />
        <div>
          <p className="font-bold text-[#245C3D]">
            Prosedur Verifikasi Manual Efdi Kitchen
          </p>
          <p className="mt-0.5 text-xs text-[#45544A]">
            Pengelola mencocokkan gambar bukti pembayaran dengan dana yang benar-benar
            masuk ke rekening/QRIS secara manual sebelum menekan{' '}
            <strong>Terima Pembayaran</strong>. Penerimaan DP memindahkan pesanan
            menjadi <strong>Pesanan Baru</strong>; penerimaan pelunasan membuat
            status pembayaran menjadi <strong>Lunas</strong> tanpa mengubah tahap
            produksi.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('Menunggu Verifikasi')}
          className={`min-h-[40px] rounded-full px-4 text-xs font-semibold cursor-pointer ${
            tab === 'Menunggu Verifikasi'
              ? 'bg-[#245C3D] text-white'
              : 'bg-white border border-[#DCE5DA] text-[#243128]'
          }`}
        >
          Menunggu Verifikasi ({statusBadgeCount('Menunggu Verifikasi')})
        </button>
        <button
          type="button"
          onClick={() => setTab('Semua')}
          className={`min-h-[40px] rounded-full px-4 text-xs font-semibold cursor-pointer ${
            tab === 'Semua'
              ? 'bg-[#245C3D] text-white'
              : 'bg-white border border-[#DCE5DA] text-[#243128]'
          }`}
        >
          Semua Riwayat ({payments.length})
        </button>
      </div>

      {/* Split List & Detail Panel */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          title="Tidak ada pembayaran pada daftar ini"
          description="Seluruh bukti pembayaran yang masuk sudah diperiksa."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-sm">
                <thead className="bg-[#EEF5EC] text-xs font-semibold text-[#243128]">
                  <tr>
                    <th className="px-4 py-3 text-left">Kode Pesanan</th>
                    <th className="px-4 py-3 text-left">Jenis &amp; Metode</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                    <th className="px-4 py-3 text-left">Waktu Unggah</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EC]">
                  {filteredPayments.map((p) => {
                    const active = selectedPayment?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={
                          active ? 'bg-[#EEF5EC]/70' : 'hover:bg-[#F5F7F4]/70'
                        }
                      >
                        <td className="px-4 py-3 font-mono text-xs font-bold text-[#245C3D]">
                          {p.kodePesanan}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold text-[#243128]">
                            {p.jenis}
                          </p>
                          <p className="text-[#55645A]">{p.metode}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatRupiah(p.nominal)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#55645A]">
                          {formatTanggalWaktuWib(p.waktuUnggah)}
                        </td>
                        <td className="px-4 py-3">
                          <PaymentRecordBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedId(p.id)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            Periksa
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Inspection Panel */}
          <div className="lg:col-span-5">
            {selectedPayment && selectedOrder && (
              <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-[#EEF2EC] pb-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-[#245C3D]">
                      {selectedPayment.kodePesanan}
                    </p>
                    <p className="text-xs text-[#55645A]">
                      {selectedOrder.namaPelanggan} • {selectedPayment.jenis}{' '}
                      ({selectedPayment.metode})
                    </p>
                  </div>
                  <PaymentRecordBadge status={selectedPayment.status} />
                </div>

                {selectedPayment.buktiUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-[#DCE5DA] bg-[#F5F7F4]">
                    <img
                      src={selectedPayment.buktiUrl}
                      alt={`Bukti pembayaran ${selectedPayment.kodePesanan}`}
                      className="mx-auto max-h-60 w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setZoomOpen(true)}
                      className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#243128] shadow-xs cursor-pointer"
                    >
                      <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                      Perbesar Bukti
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#F5F7F4] p-4 text-xs text-[#55645A]">
                    Pembayaran Tunai (Datang Langsung) tanpa unggahan bukti gambar.
                  </div>
                )}

                <div className="space-y-1.5 rounded-xl bg-[#F5F7F4] p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#55645A]">Nominal Unggahan Ini</span>
                    <span className="font-bold text-[#243128]">
                      {formatRupiah(selectedPayment.nominal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#55645A]">Total Tagihan Pesanan</span>
                    <span className="font-semibold">
                      {formatRupiah(selectedOrder.totalHarga)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#55645A]">DP Minimum (50%)</span>
                    <span>{formatRupiah(selectedOrder.dpMinimumNota)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#55645A]">Sudah Diterima</span>
                    <span className="font-semibold text-[#137333]">
                      {formatRupiah(getVerifiedPaidAmount(selectedOrder.id))}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#DCE5DA] pt-1.5 font-bold text-[#245C3D]">
                    <span>Sisa Pembayaran Saat Ini</span>
                    <span>{formatRupiah(getRemainingBalance(selectedOrder))}</span>
                  </div>
                </div>

                {selectedPayment.alasanPenolakan && (
                  <div className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-3 text-xs text-[#B42318]">
                    <strong>Alasan Penolakan:</strong>{' '}
                    {selectedPayment.alasanPenolakan}
                  </div>
                )}

                {selectedPayment.status === 'Menunggu Verifikasi' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Button
                      variant="danger"
                      onClick={() => {
                        setRejectReason('');
                        setRejectError('');
                        setRejectOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      Tolak Pembayaran
                    </Button>
                    <Button variant="primary" onClick={handleApprove}>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Terima Pembayaran
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {/* Cash Recording ONLY for Datang Langsung */}
      <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 border-b border-[#EEF2EC] pb-3">
          <Banknote className="h-5 w-5 text-[#245C3D]" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-[#243128]">
              Pencatatan Pembayaran Tunai (Khusus Kanal Datang Langsung)
            </h2>
            <p className="text-xs text-[#55645A]">
              Tanpa unggah bukti. Hanya berlaku untuk pesanan Datang Langsung
              yang belum lunas dan belum dibatalkan.
            </p>
          </div>
        </div>

        {walkInOrders.length === 0 ? (
          <p className="mt-4 text-sm text-[#55645A]">
            Tidak ada pesanan Datang Langsung yang memiliki sisa tagihan saat ini.
          </p>
        ) : (
          <form
            onSubmit={handleCashSubmit}
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end"
          >
            <div className="sm:col-span-5">
              <Select
                id="cash-order"
                label="Pesanan Datang Langsung"
                value={cashOrderId}
                onChange={(e) => setCashOrderId(Number(e.target.value))}
              >
                {walkInOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.kodePesanan} — {o.namaPelanggan} (Sisa{' '}
                    {formatRupiah(getRemainingBalance(o))})
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Select
                id="cash-jenis"
                label="Jenis"
                value={cashJenis}
                onChange={(e) => setCashJenis(e.target.value as PaymentType)}
              >
                <option value="DP">DP</option>
                <option value="Pelunasan">Pelunasan</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Input
                id="cash-nominal"
                label="Nominal (Rp)"
                type="number"
                required
                value={cashNominal}
                onChange={(e) => setCashNominal(e.target.value)}
                placeholder="Nominal"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" className="w-full">
                Catat Tunai
              </Button>
            </div>
            {cashError && (
              <p
                role="alert"
                className="sm:col-span-12 text-xs font-medium text-[#B42318]"
              >
                {cashError}
              </p>
            )}
          </form>
        )}
      </section>

      {/* Zoom Proof Modal */}
      <Modal
        open={zoomOpen && Boolean(selectedPayment?.buktiUrl)}
        onClose={() => setZoomOpen(false)}
        title={`Bukti Pembayaran ${selectedPayment?.kodePesanan ?? ''}`}
        maxWidthClass="max-w-2xl"
      >
        {selectedPayment?.buktiUrl && (
          <img
            src={selectedPayment.buktiUrl}
            alt="Bukti pembayaran diperbesar"
            className="mx-auto max-h-[75vh] w-full rounded-xl bg-[#F5F7F4] object-contain"
          />
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Tolak Bukti Pembayaran"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <Textarea
            id="reject-reason"
            label="Alasan Penolakan (Wajib, maks. 255 karakter)"
            required
            rows={3}
            maxLength={255}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            helper={`${rejectReason.length}/255 karakter`}
            error={rejectError}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleReject}>
              Tolak Pembayaran
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
