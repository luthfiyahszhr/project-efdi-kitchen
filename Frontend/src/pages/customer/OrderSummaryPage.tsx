import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Info,
  QrCode,
  Landmark,
  Upload,
} from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/ui/Badges';
import { EmptyState } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/FormControls';
import { NotaModal } from '../../components/ui/NotaDocument';
import { useApp } from '../../context/AppContext';
import {
  formatRupiah,
  formatTanggalIndonesia,
  formatWaktuWib,
} from '../../utils/format';

export const OrderSummaryPage: React.FC = () => {
  const { kode } = useParams();
  const navigate = useNavigate();
  const {
    orders,
    getVerifiedPaidAmount,
    getRemainingBalance,
    getOrderPayments,
    downloadNota,
    pushToast,
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
            title="Ringkasan pesanan tidak ditemukan"
            description="Pastikan kode pesanan benar atau periksa melalui halaman Cek Pesanan."
            action={
              <Button variant="primary" onClick={() => navigate('/cek-pesanan')}>
                Ke Halaman Cek Pesanan
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

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(order.kodePesanan);
      pushToast({
        type: 'success',
        title: 'Kode Pesanan Disalin',
        message: `${order.kodePesanan} siap ditempel.`,
      });
    } catch {
      pushToast({
        type: 'info',
        title: 'Salin Manual',
        message: `Kode pesanan Anda: ${order.kodePesanan}`,
      });
    }
  };

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        {/* Confirmation Banner */}
        <div className="rounded-2xl border border-[#A8DAB5] bg-[#EEF5EC] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-7 w-7 shrink-0 text-[#245C3D]"
                aria-hidden="true"
              />
              <div>
                <h1 className="font-brand text-2xl font-bold text-[#243128]">
                  Pesanan Berhasil Dibuat
                </h1>
                <p className="mt-1 text-sm text-[#45544A]">
                  Harap simpan kode pesanan di bawah ini untuk memantau status
                  pesanan dan mengunggah bukti pembayaran.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#C5DEC1] bg-white px-4 py-3">
              <div>
                <p className="text-[11px] font-medium text-[#55645A]">
                  Kode Pesanan
                </p>
                <p className="font-mono text-xl font-bold tracking-wider text-[#245C3D]">
                  {order.kodePesanan}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={copyCode}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Salin
              </Button>
            </div>
          </div>
        </div>

        {/* Nota & Detail Card */}
        <section className="rounded-2xl border border-[#DCE5DA] bg-white p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EEF2EC] pb-4">
            <div>
              <p className="text-xs font-semibold text-[#55645A]">Nomor Nota</p>
              <p className="text-lg font-bold text-[#243128]">
                {order.nomorNota}
              </p>
              <p className="mt-1 text-xs text-[#55645A]">
                Pemesan: <strong className="text-[#243128]">{order.namaPelanggan}</strong> ({order.noKontak}) • Kanal: {order.kanal}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.statusPesanan} />
              <PaymentStatusBadge
                status={order.statusPembayaran}
                hasPendingPelunasan={hasPendingPelunasan}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-xl bg-[#F5F7F4] p-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-[#55645A]">Tanggal Acara</p>
              <p className="font-semibold text-[#243128]">
                {formatTanggalIndonesia(order.tanggalAcara, true)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#55645A]">Waktu Pengambilan / Acara</p>
              <p className="font-semibold text-[#243128]">
                {formatWaktuWib(order.waktuAcara)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#DCE5DA]">
            <table className="w-full text-sm">
              <thead className="bg-[#EEF5EC] text-[#243128]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Paket</th>
                  <th className="px-4 py-3 text-right font-semibold">Porsi</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Harga/Porsi
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EC]">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-[#243128]">
                      {item.namaProduk}
                    </td>
                    <td className="px-4 py-3 text-right">{item.jumlahPorsi}</td>
                    <td className="px-4 py-3 text-right">
                      {formatRupiah(item.hargaPerPorsi)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatRupiah(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Initial Nota vs Live Balance */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#DCE5DA] bg-[#F5F7F4] p-4 space-y-2 text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#55645A]">
                Rincian Nota Awal
              </p>
              <div className="flex justify-between">
                <span>Total Pesanan</span>
                <span className="font-bold">{formatRupiah(order.totalHarga)}</span>
              </div>
              <div className="flex justify-between">
                <span>DP Minimum (50%)</span>
                <span className="font-semibold">
                  {formatRupiah(order.dpMinimumNota)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sisa sesuai Nota Awal</span>
                <span className="font-semibold">
                  {formatRupiah(order.sisaAwalNota)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#C5DEC1] bg-[#EEF5EC] p-4 space-y-2 text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#245C3D]">
                Saldo Berjalan Saat Ini
              </p>
              <div className="flex justify-between">
                <span>Pembayaran Sudah Diterima</span>
                <span className="font-semibold text-[#137333]">
                  {formatRupiah(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#C5DEC1] pt-2 text-base font-bold text-[#245C3D]">
                <span>Sisa Pembayaran Saat Ini</span>
                <span>{formatRupiah(sisaSaatIni)}</span>
              </div>
              <p className="text-[11px] text-[#45544A]">
                Unggahan bukti yang masih menunggu verifikasi belum mengurangi
                saldo hingga diverifikasi pengelola.
              </p>
            </div>
          </div>
        </section>

        {/* Payment Instructions (Clear Placeholder) */}
        <section className="rounded-2xl border border-[#DCE5DA] bg-white p-6 space-y-4">
          <h2 className="text-base font-bold text-[#243128]">
            Instruksi Pembayaran (QRIS atau Transfer Bank)
          </h2>
          <p className="text-xs text-[#55645A]">
            Lakukan pembayaran DP minimal{' '}
            <strong className="text-[#243128]">
              {formatRupiah(order.dpMinimumNota)}
            </strong>{' '}
            (boleh hingga total tagihan) melalui salah satu kanal berikut, lalu
            unggah bukti pembayarannya untuk diverifikasi pengelola secara manual.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* QRIS Placeholder */}
            <div className="rounded-xl border border-[#F3D88C] bg-[#FEF7E0]/50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#243128]">
                <QrCode className="h-4 w-4 text-[#245C3D]" aria-hidden="true" />
                QRIS Demonstrasi (Simulasi)
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#9A6700] bg-white p-2 text-center">
                  <QrCode className="h-10 w-10 text-[#9A6700]" aria-hidden="true" />
                  <span className="mt-1 text-[9px] font-bold uppercase text-[#9A6700]">
                    QR SIMULASI
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-[#55645A]">
                  <p className="font-bold text-[#855800]">
                    BUKAN KODE PEMBAYARAN NYATA
                  </p>
                  <p className="mt-1">
                    Merchant: Efdi Kitchen (Contoh). Kode QR ini hanya ilustrasi
                    prototipe dan tidak dapat dipindai untuk transaksi riil.
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Transfer Placeholder */}
            <div className="rounded-xl border border-[#DCE5DA] bg-[#F5F7F4] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#243128]">
                <Landmark className="h-4 w-4 text-[#245C3D]" aria-hidden="true" />
                Transfer Bank (Rekening Placeholder)
              </div>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-[#55645A]">Bank</dt>
                  <dd className="font-semibold text-[#243128]">
                    Bank Contoh Nasional (Simulasi)
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#55645A]">Nomor Rekening</dt>
                  <dd className="font-mono font-bold text-[#243128]">
                    0000-1234-5678-90
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#55645A]">Atas Nama</dt>
                  <dd className="font-semibold text-[#243128]">
                    Efdi Kitchen (Contoh)
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {order.kanal === 'Datang Langsung' && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#C5DEC1] bg-[#EEF5EC] p-3.5 text-xs text-[#245C3D]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Pesanan dengan kanal <strong>Datang Langsung</strong> juga dapat
                dibayar secara <strong>Tunai</strong> melalui pencatatan pengelola
                dapur.
              </span>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {order.statusPesanan !== 'Dibatalkan' &&
            order.statusPembayaran !== 'Lunas' && (
              <Button
                variant="primary"
                onClick={() => navigate(`/pesanan/${order.kodePesanan}/bayar`)}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Unggah Bukti Pembayaran
              </Button>
            )}
          <Button
            variant="secondary"
            onClick={() => void downloadNota(order)}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Unduh Nota
          </Button>
          <Button variant="outline" onClick={() => setNotaOpen(true)}>
            Pratinjau Nota
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/pesanan/${order.kodePesanan}`)}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Lihat Status Pesanan
          </Button>
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
