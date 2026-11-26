import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Search } from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/ui/Badges';
import { Button, Input } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import {
  formatRupiah,
  formatTanggalIndonesia,
  normalizePhone,
} from '../../utils/format';

export const CheckOrderPage: React.FC = () => {
  const { currentUser, orders, payments } = useApp();
  const navigate = useNavigate();

  const [kodePesanan, setKodePesanan] = useState('');
  const [noKontak, setNoKontak] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Customer') {
      return orders.filter((o) => o.pelangganId === currentUser.id);
    }
    return orders.slice(0, 5);
  }, [currentUser, orders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const codeNorm = kodePesanan.trim().toUpperCase();
    const phoneNorm = normalizePhone(noKontak);

    if (!codeNorm || !phoneNorm) {
      setErrorMsg('Pesanan tidak ditemukan atau data tidak sesuai.');
      return;
    }

    const found = orders.find((o) => {
      const matchCode = o.kodePesanan.toUpperCase() === codeNorm;
      const matchPhone = normalizePhone(o.noKontak) === phoneNorm;
      if (!matchCode || !matchPhone) return false;
      if (currentUser?.role === 'Customer' && o.pelangganId !== currentUser.id) {
        return false;
      }
      return true;
    });

    if (!found) {
      setErrorMsg('Pesanan tidak ditemukan atau data tidak sesuai.');
      return;
    }

    navigate(`/pesanan/${found.kodePesanan}`);
  };

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#DCE5DA] bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-brand text-2xl font-bold text-[#243128] sm:text-3xl">
            Cek Status Pesanan
          </h1>
          <p className="mt-1.5 text-sm text-[#55645A]">
            Masukkan kode pesanan dan nomor kontak yang digunakan saat memesan.
          </p>

          {errorMsg && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-3.5 text-sm text-[#B42318]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Input
              id="cek-kode"
              label="Kode Pesanan"
              required
              placeholder="Contoh: EFD-A7K9P2"
              value={kodePesanan}
              onChange={(e) => setKodePesanan(e.target.value)}
            />

            <Input
              id="cek-kontak"
              label="Nomor Kontak"
              required
              placeholder="Contoh: 081234567890"
              value={noKontak}
              onChange={(e) => setNoKontak(e.target.value)}
            />

            <Button type="submit" variant="primary" className="w-full">
              <Search className="h-4 w-4" aria-hidden="true" />
              Cek Pesanan
            </Button>
          </form>
        </div>

        {/* Helpful list of logged-in user's orders */}
        {myOrders.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#243128]">
              {currentUser?.role === 'Customer'
                ? 'Pesanan Anda'
                : 'Contoh Pesanan Terbaru (Akses Pengelola)'}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {myOrders.map((o) => {
                const pendingPel = payments.some(
                  (p) =>
                    p.pesananId === o.id &&
                    p.jenis === 'Pelunasan' &&
                    p.status === 'Menunggu Verifikasi'
                );
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => navigate(`/pesanan/${o.kodePesanan}`)}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-[#DCE5DA] bg-white p-4 text-left transition-colors hover:border-[#245C3D] hover:bg-[#F5F7F4] cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div>
                        <p className="font-mono text-sm font-bold text-[#245C3D]">
                          {o.kodePesanan}
                        </p>
                        <p className="text-xs text-[#55645A]">
                          {formatTanggalIndonesia(o.tanggalAcara)} •{' '}
                          {o.namaPelanggan}
                        </p>
                      </div>
                      <ArrowRight
                        className="h-4 w-4 text-[#55645A]"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                      <div className="flex flex-wrap gap-1.5">
                        <OrderStatusBadge status={o.statusPesanan} />
                        <PaymentStatusBadge
                          status={o.statusPembayaran}
                          hasPendingPelunasan={pendingPel}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#243128]">
                        {formatRupiah(o.totalHarga)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </CustomerLayout>
  );
};
