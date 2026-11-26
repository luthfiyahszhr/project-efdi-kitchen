import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileText,
  Upload,
} from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import {
  OrderStatusBadge,
  PaymentRecordBadge,
  PaymentStatusBadge,
} from '../../components/ui/Badges';
import { OrderTimeline } from '../../components/ui/DataDisplay';
import { EmptyState } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/FormControls';
import { NotaModal } from '../../components/ui/NotaDocument';
import { useApp } from '../../context/AppContext';
import {
  formatRupiah,
  formatTanggalIndonesia,
  formatTanggalWaktuWib,
  formatWaktuWib,
} from '../../utils/format';

export const OrderStatusPage: React.FC = () => {
  const { kode } = useParams();
  const navigate = useNavigate();
  const {
    orders,
    getVerifiedPaidAmount,
    getRemainingBalance,
    getOrderPayments,
    downloadNota,
  } = useApp();

  const [notaOpen, setNotaOpen] = useState(false);

  const order = orders.find(
    (o) => o.kodePesanan.toUpperCase() === (kode ?? '').toUpperCase()
  );

  if (!order) {
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <EmptyState
            title="Pesanan tidak ditemukan atau data tidak sesuai."
            description="Periksa kembali kode pesanan Anda."
            action={
              <Button variant="primary" onClick={() => navigate('/cek-pesanan')}>
                Kembali ke Cek Pesanan
              </Button>
            }
          />
        </div>
      </CustomerLayout>
    );
  }

  const paidAmount = getVerifiedPaidAmount(order.id);
  const sisaSaatIni = getRemainingBalance(order);
  const orderPayments = getOrderPayments(order.id);
  const hasPendingPelunasan = orderPayments.some(
    (p) => p.jenis === 'Pelunasan' && p.status === 'Menunggu Verifikasi'
  );
  const hasPendingDp = orderPayments.some(
    (p) => p.jenis === 'DP' && p.status === 'Menunggu Verifikasi'
  );
  const rejectedPayments = orderPayments.filter((p) => p.status === 'Ditolak');
  const latestRejected = rejectedPayments[0];

  const canUploadPayment =
    order.statusPesanan !== 'Dibatalkan' &&
    order.statusPembayaran !== 'Lunas' &&
    !hasPendingPelunasan &&
    !(order.statusPembayaran === 'Menunggu Verifikasi' && hasPendingDp);

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        <Link
          to="/cek-pesanan"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#245C3D] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Cek Pesanan
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#55645A]">
              Status Pesanan &amp; Pembayaran
            </p>
            <h1 className="font-brand text-2xl font-bold text-[#243128] sm:text-3xl">
              Pesanan {order.kodePesanan}
            </h1>
            <p className="mt-1 text-xs text-[#55645A]">
              Nota: {order.nomorNota} • Dibuat{' '}
              {formatTanggalWaktuWib(order.dibuatPada)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canUploadPayment && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/pesanan/${order.kodePesanan}/bayar`)}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                {paidAmount > 0 ? 'Unggah Pelunasan' : 'Unggah Bukti DP'}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void downloadNota(order)}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Unduh Nota
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNotaOpen(true)}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Lihat Nota
            </Button>
          </div>
        </div>

        {/* Rejected Payment Alert */}
        {latestRejected && order.statusPembayaran !== 'Lunas' && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#FECDCA] bg-[#FEF3F2] p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-[#B42318]"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-bold text-[#B42318]">
                  Bukti Pembayaran {latestRejected.jenis} Ditolak
                </p>
                <p className="mt-0.5 text-sm text-[#7A271A]">
                  Alasan: {latestRejected.alasanPenolakan || 'Tidak sesuai.'}
                </p>
              </div>
            </div>
            {canUploadPayment && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => navigate(`/pesanan/${order.kodePesanan}/bayar`)}
              >
                Unggah Ulang Bukti
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Production Timeline */}
          <div className="lg:col-span-7 space-y-6">
            <section className="rounded-2xl border border-[#DCE5DA] bg-white p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2EC] pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#243128]">
                    Proses Pesanan
                  </h2>
                  <p className="text-xs text-[#55645A]">
                    Tahapan produksi terpisah dari status verifikasi pembayaran.
                  </p>
                </div>
                <OrderStatusBadge status={order.statusPesanan} />
              </div>

              <OrderTimeline order={order} />
            </section>

            {/* Payment History */}
            <section className="rounded-2xl border border-[#DCE5DA] bg-white p-6">
              <h2 className="text-base font-bold text-[#243128]">
                Riwayat Pembayaran
              </h2>
              {orderPayments.length === 0 ? (
                <p className="mt-3 text-sm text-[#55645A]">
                  Belum ada bukti pembayaran yang diunggah.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {orderPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#EEF2EC] bg-[#F5F7F4] p-4"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#243128]">
                          {p.jenis} • {p.metode}
                        </p>
                        <p className="text-xs text-[#55645A]">
                          Diunggah: {formatTanggalWaktuWib(p.waktuUnggah)}
                        </p>
                        {p.alasanPenolakan && (
                          <p className="mt-1 text-xs font-medium text-[#B42318]">
                            Alasan ditolak: {p.alasanPenolakan}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-bold text-[#243128]">
                          {formatRupiah(p.nominal)}
                        </p>
                        <PaymentRecordBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right: Summary & Payment Status */}
          <div className="lg:col-span-5 space-y-6">
            <section className="rounded-2xl border border-[#DCE5DA] bg-white p-6 space-y-4">
              <h2 className="text-base font-bold text-[#243128]">
                Status Pembayaran &amp; Saldo
              </h2>
              <PaymentStatusBadge
                status={order.statusPembayaran}
                hasPendingPelunasan={hasPendingPelunasan}
              />

              <div className="space-y-2 rounded-xl bg-[#F5F7F4] p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#55645A]">Total Tagihan</span>
                  <span className="font-bold">
                    {formatRupiah(order.totalHarga)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#55645A]">Sudah Diterima</span>
                  <span className="font-semibold text-[#137333]">
                    {formatRupiah(paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#DCE5DA] pt-2 font-bold text-[#245C3D]">
                  <span>Sisa Pembayaran Saat Ini</span>
                  <span>{formatRupiah(sisaSaatIni)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#DCE5DA] bg-white p-6 space-y-3 text-sm">
              <h2 className="text-base font-bold text-[#243128]">
                Ringkasan Pesanan
              </h2>
              <div>
                <p className="text-xs text-[#55645A]">Pemesan</p>
                <p className="font-semibold text-[#243128]">
                  {order.namaPelanggan} ({order.noKontak})
                </p>
              </div>
              <div>
                <p className="text-xs text-[#55645A]">Jadwal Acara / Pengambilan</p>
                <p className="font-semibold text-[#243128]">
                  {formatTanggalIndonesia(order.tanggalAcara, true)} •{' '}
                  {formatWaktuWib(order.waktuAcara)}
                </p>
              </div>
              <div className="border-t border-[#EEF2EC] pt-3 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span>
                      {item.namaProduk} ({item.jumlahPorsi} porsi)
                    </span>
                    <span className="font-semibold">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              {order.catatan && (
                <div className="border-t border-[#EEF2EC] pt-3">
                  <p className="text-xs text-[#55645A]">Catatan</p>
                  <p className="mt-0.5 text-xs text-[#243128]">{order.catatan}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <NotaModal
        open={notaOpen}
        onClose={() => setNotaOpen(false)}
        order={order}
        paidAmount={paidAmount}
      />
    </CustomerLayout>
  );
};
