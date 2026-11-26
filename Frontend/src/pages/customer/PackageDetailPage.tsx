import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShoppingBag } from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { StoreStatusBanner } from '../../components/ui/Badges';
import { ProductPhoto } from '../../components/ui/DataDisplay';
import { EmptyState } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import { formatRupiah } from '../../utils/format';

export const PackageDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    products,
    effectiveStoreStatus,
    currentUser,
    setOrderDraft,
  } = useApp();

  const product = products.find((p) => p.id === Number(id) && p.aktif);

  const handleOrder = () => {
    if (!product || !effectiveStoreStatus.isOpen) return;
    setOrderDraft({
      items: [{ produkId: product.id, jumlahPorsi: 20 }],
      returnToAfterAuth: '/pesan',
    });
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate('/pesan');
  };

  if (!product) {
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <EmptyState
            title="Paket tidak ditemukan atau tidak aktif"
            description="Paket yang Anda cari tidak tersedia di katalog aktif saat ini."
            action={
              <Button variant="primary" onClick={() => navigate('/paket')}>
                Kembali ke Katalog
              </Button>
            }
          />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 pb-28 sm:px-6 md:pb-12">
        <Link
          to="/paket"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#245C3D] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Katalog
        </Link>

        <div className="mt-5">
          <StoreStatusBanner status={effectiveStoreStatus} compact />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-[#DCE5DA] bg-[#EEF5EC] shadow-xs">
              <ProductPhoto
                src={product.fotoUrl}
                alt={product.nama}
                className="aspect-[4/3] w-full"
              />
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col">
            <span className="inline-flex w-fit rounded-full bg-[#EEF5EC] px-3 py-1 text-xs font-semibold text-[#245C3D]">
              {product.jenis}
            </span>
            <h1 className="font-brand mt-3 text-3xl font-bold text-[#243128]">
              {product.nama}
            </h1>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#245C3D]">
                {formatRupiah(product.hargaPerPorsi)}
              </span>
              <span className="text-sm text-[#55645A]">/ porsi</span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#45544A]">
              {product.deskripsi}
            </p>

            <div className="mt-6 rounded-2xl border border-[#DCE5DA] bg-[#F5F7F4] p-5">
              <h2 className="text-sm font-bold text-[#243128]">
                Isi Paket Lengkap
              </h2>
              <ul className="mt-3 space-y-2.5">
                {product.isiLengkap.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-[#243128]"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#245C3D]"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Desktop CTA */}
            <div className="mt-6 hidden md:block">
              <Button
                variant="primary"
                disabled={!effectiveStoreStatus.isOpen}
                onClick={handleOrder}
                className="w-full"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Pesan Paket Ini
              </Button>
              {!effectiveStoreStatus.isOpen && (
                <p className="mt-2 text-xs font-medium text-[#855800]">
                  Tombol pesan dinonaktifkan karena pemesanan sedang tutup.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA without overlapping content */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#DCE5DA] bg-white/95 px-4 py-3 backdrop-blur-xs md:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[#55645A]">Harga per porsi</p>
            <p className="text-base font-bold text-[#245C3D]">
              {formatRupiah(product.hargaPerPorsi)}
            </p>
          </div>
          <Button
            variant="primary"
            disabled={!effectiveStoreStatus.isOpen}
            onClick={handleOrder}
            className="flex-1"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Pesan Paket Ini
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
};
