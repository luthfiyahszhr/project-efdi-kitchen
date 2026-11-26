import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Info,
  Trash2,
  Upload,
} from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/ui/Badges';
import { UploadArea } from '../../components/ui/DataDisplay';
import { ConfirmDialog, EmptyState } from '../../components/ui/Feedback';
import { Button, Input, Select } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import type { PaymentMethod, PaymentType } from '../../types/domain';
import { formatRupiah } from '../../utils/format';

export const PaymentUploadPage: React.FC = () => {
  const { kode } = useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    orders,
    getVerifiedPaidAmount,
    getRemainingBalance,
    getOrderPayments,
    uploadPaymentProof,
    cancelOrderByCustomer,
  } = useApp();

  const order = orders.find(
    (o) => o.kodePesanan.toUpperCase() === (kode ?? '').toUpperCase()
  );

  const paidAmount = order ? getVerifiedPaidAmount(order.id) : 0;
  const remaining = order ? getRemainingBalance(order) : 0;
  const orderPayments = order ? getOrderPayments(order.id) : [];

  const hasVerifiedDp = paidAmount > 0;
  const jenis: PaymentType = hasVerifiedDp ? 'Pelunasan' : 'DP';

  const [metode, setMetode] = useState<Exclude<PaymentMethod, 'Tunai'>>('Transfer Bank');
  const [customDpNominal, setCustomDpNominal] = useState<string | null>(null);
  const [buktiUrl, setBuktiUrl] = useState('');
  const [buktiFileName, setBuktiFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const nominalStr =
    jenis === 'Pelunasan'
      ? String(remaining)
      : customDpNominal ?? (order ? String(order.dpMinimumNota) : '');

  // 8-minute countdown timer since order created
  const orderCreatedAt = order?.dibuatPada;
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!orderCreatedAt) return;
    const updateTimer = () => {
      const end = new Date(orderCreatedAt).getTime() + 8 * 60 * 1000;
      setSecondsLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    };
    updateTimer();
    const t = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(t);
  }, [orderCreatedAt]);

  if (!order) {
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <EmptyState
            title="Pesanan tidak ditemukan"
            description="Pastikan kode pesanan sudah benar."
            action={
              <Button variant="primary" onClick={() => navigate('/cek-pesanan')}>
                Cek Pesanan
              </Button>
            }
          />
        </div>
      </CustomerLayout>
    );
  }

  const isClosedForPayment =
    order.statusPesanan === 'Dibatalkan' || order.statusPembayaran === 'Lunas';

  const pendingSameType = orderPayments.some(
    (p) => p.jenis === jenis && p.status === 'Menunggu Verifikasi'
  );
  const hasPendingPelunasan = orderPayments.some(
    (p) => p.jenis === 'Pelunasan' && p.status === 'Menunggu Verifikasi'
  );

  const canSelfCancel =
    currentUser?.role === 'Customer' &&
    order.pelangganId === currentUser.id &&
    order.statusPesanan === 'Menunggu DP' &&
    order.statusPembayaran === 'Belum Bayar' &&
    orderPayments.length === 0 &&
    secondsLeft > 0;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdownText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFileError('');

    if (isClosedForPayment || pendingSameType) return;

    const nominal = Number(nominalStr);
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setFormError('Masukkan nominal pembayaran yang valid.');
      return;
    }

    if (jenis === 'DP') {
      if (nominal < order.dpMinimumNota || nominal > remaining) {
        setFormError(
          `Nominal DP harus antara ${formatRupiah(order.dpMinimumNota)} hingga ${formatRupiah(remaining)}.`
        );
        return;
      }
    } else if (nominal !== remaining) {
      setFormError(
        `Nominal pelunasan harus sama dengan sisa pembayaran saat ini (${formatRupiah(remaining)}).`
      );
      return;
    }

    if (!buktiUrl) {
      setFileError('Bukti pembayaran (JPG/JPEG/PNG) wajib diunggah.');
      return;
    }

    const res = uploadPaymentProof({
      orderId: order.id,
      jenis,
      metode,
      nominal,
      buktiUrl,
      buktiNamaFile: buktiFileName,
    });

    if (!res.ok) {
      setFormError(res.error || 'Gagal mengunggah bukti pembayaran.');
      return;
    }

    navigate(`/pesanan/${order.kodePesanan}`);
  };

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        <Link
          to={`/pesanan/${order.kodePesanan}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#245C3D] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Status Pesanan
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-brand text-2xl font-bold text-[#243128] sm:text-3xl">
              Unggah Bukti Pembayaran
            </h1>
            <p className="mt-1 text-sm text-[#55645A]">
              Kode Pesanan:{' '}
              <strong className="font-mono text-[#245C3D]">
                {order.kodePesanan}
              </strong>{' '}
              • {order.nomorNota}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={order.statusPesanan} />
            <PaymentStatusBadge
              status={order.statusPembayaran}
              hasPendingPelunasan={hasPendingPelunasan}
            />
          </div>
        </div>

        {/* 8-minute self-cancel box */}
        {canSelfCancel && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F3D88C] bg-[#FEF7E0] p-4">
            <div className="flex items-start gap-3">
              <Clock
                className="mt-0.5 h-5 w-5 shrink-0 text-[#855800]"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-bold text-[#243128]">
                  Batas Pembatalan Mandiri:{' '}
                  <span className="font-mono text-[#855800]">
                    {countdownText}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-[#55645A]">
                  Anda dapat membatalkan pesanan ini secara mandiri dalam 8
                  menit sejak pesanan dibuat selama belum mengunggah bukti.
                  Setelah waktu habis, unggah bukti tetap tersedia.
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Batalkan Pesanan
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Billing Summary */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#DCE5DA] bg-[#F5F7F4] p-5 space-y-3 text-sm">
              <h2 className="text-base font-bold text-[#243128]">
                Ringkasan Tagihan
              </h2>
              <div className="flex justify-between">
                <span className="text-[#55645A]">Total Tagihan</span>
                <span className="font-bold">{formatRupiah(order.totalHarga)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#55645A]">DP Minimum (50%)</span>
                <span className="font-semibold">
                  {formatRupiah(order.dpMinimumNota)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#55645A]">Sudah Diterima</span>
                <span className="font-semibold text-[#137333]">
                  {formatRupiah(paidAmount)}
                </span>
              </div>
              <div className="border-t border-[#DCE5DA] pt-3 flex justify-between text-base font-bold text-[#245C3D]">
                <span>Sisa Pembayaran Saat Ini</span>
                <span>{formatRupiah(remaining)}</span>
              </div>
              <p className="text-xs text-[#55645A]">
                Status pembayaran hanya berubah setelah pengelola memeriksa dan
                menerima bukti secara manual.
              </p>
            </div>
          </div>

          {/* Upload Form */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6">
              {isClosedForPayment ? (
                <div className="flex items-start gap-3 rounded-xl border border-[#C5DEC1] bg-[#EEF5EC] p-4 text-sm text-[#243128]">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#245C3D]" aria-hidden="true" />
                  <div>
                    <p className="font-bold">
                      Unggah bukti pembayaran tidak tersedia
                    </p>
                    <p className="mt-1 text-xs text-[#55645A]">
                      {order.statusPesanan === 'Dibatalkan'
                        ? 'Pesanan yang telah dibatalkan tidak menerima unggahan pembayaran baru.'
                        : 'Pesanan ini sudah berstatus Lunas.'}
                    </p>
                  </div>
                </div>
              ) : pendingSameType ? (
                <div className="flex items-start gap-3 rounded-xl border border-[#F3D88C] bg-[#FEF7E0] p-4 text-sm text-[#243128]">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#855800]" aria-hidden="true" />
                  <div>
                    <p className="font-bold">
                      Pembayaran {jenis} Menunggu Verifikasi
                    </p>
                    <p className="mt-1 text-xs text-[#55645A]">
                      Bukti pembayaran {jenis} Anda sudah diterima sistem dan
                      sedang menunggu pemeriksaan pengelola. Unggahan ganda untuk
                      jenis pembayaran yang sama dicegah hingga verifikasi selesai.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {formError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-3.5 text-sm text-[#B42318]"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select
                      id="pay-jenis"
                      label="Jenis Pembayaran"
                      value={jenis}
                      disabled
                      helper={
                        jenis === 'DP'
                          ? 'Pesanan belum menerima DP'
                          : 'DP telah diterima, lanjut pelunasan'
                      }
                    >
                      <option value="DP">DP (Uang Muka)</option>
                      <option value="Pelunasan">Pelunasan</option>
                    </Select>

                    <Select
                      id="pay-metode"
                      label="Metode Pembayaran"
                      value={metode}
                      onChange={(e) =>
                        setMetode(
                          e.target.value as Exclude<PaymentMethod, 'Tunai'>
                        )
                      }
                    >
                      <option value="Transfer Bank">Transfer Bank</option>
                      <option value="QRIS">QRIS</option>
                    </Select>
                  </div>

                  <Input
                    id="pay-nominal"
                    label="Nominal Pembayaran (Rp)"
                    type="number"
                    required
                    value={nominalStr}
                    readOnly={jenis === 'Pelunasan'}
                    onChange={(e) => setCustomDpNominal(e.target.value)}
                    helper={
                      jenis === 'DP'
                        ? `Minimal ${formatRupiah(order.dpMinimumNota)} hingga ${formatRupiah(remaining)}`
                        : `Nominal pelunasan otomatis sesuai sisa tagihan: ${formatRupiah(remaining)}`
                    }
                  />

                  <UploadArea
                    id="pay-bukti"
                    label="Unggah Bukti Transfer / QRIS"
                    maxSizeMb={5}
                    valueUrl={buktiUrl}
                    fileName={buktiFileName}
                    error={fileError}
                    onFileSelected={(url, name) => {
                      setBuktiUrl(url);
                      setBuktiFileName(name);
                      setFileError('');
                    }}
                    onClear={() => {
                      setBuktiUrl('');
                      setBuktiFileName('');
                    }}
                    onError={(msg) => setFileError(msg)}
                  />

                  <Button type="submit" variant="primary" className="w-full">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Unggah Bukti
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        danger
        title="Batalkan Pesanan?"
        confirmLabel="Ya, Batalkan Pesanan"
        description={
          <p>
            Anda akan membatalkan pesanan{' '}
            <strong>{order.kodePesanan}</strong>. Tindakan ini tidak dapat
            dibatalkan setelah dikonfirmasi.
          </p>
        }
        onConfirm={() => {
          setCancelModalOpen(false);
          const res = cancelOrderByCustomer(order.id);
          if (res.ok) {
            navigate(`/pesanan/${order.kodePesanan}`);
          }
        }}
      />
    </CustomerLayout>
  );
};
