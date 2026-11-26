import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ChefHat,
  Clock,
  Filter,
  RotateCcw,
  Search,
  Utensils,
  X,
} from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { StoreStatusBanner } from '../../components/ui/Badges';
import { PackageCard } from '../../components/ui/DataDisplay';
import { EmptyState, SkeletonCard } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import type { JenisPaket, Product } from '../../types/domain';

type PriceRange = 'semua' | 'dibawah-25' | '25-35' | 'diatas-35';

const JENIS_OPTIONS: ('Semua' | JenisPaket)[] = [
  'Semua',
  'Nasi Box',
  'Tumpeng',
  'Prasmanan',
  'Snack Box',
];

const PRICE_OPTIONS: { value: PriceRange; label: string }[] = [
  { value: 'semua', label: 'Semua Harga' },
  { value: 'dibawah-25', label: 'Di bawah Rp25.000' },
  { value: '25-35', label: 'Rp25.000 – Rp35.000' },
  { value: 'diatas-35', label: 'Di atas Rp35.000' },
];

export const CatalogPage: React.FC = () => {
  const {
    products,
    effectiveStoreStatus,
    currentUser,
    setOrderDraft,
  } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedJenis, setSelectedJenis] = useState<'Semua' | JenisPaket>('Semua');
  const [priceRange, setPriceRange] = useState<PriceRange>('semua');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isFiltering] = useState(false);

  const activeProducts = useMemo(
    () => products.filter((p) => p.aktif),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeProducts.filter((p) => {
      if (q) {
        const hay = `${p.nama} ${p.jenis} ${p.ringkasanIsi} ${p.isiLengkap.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (selectedJenis !== 'Semua' && p.jenis !== selectedJenis) {
        return false;
      }
      if (priceRange === 'dibawah-25' && p.hargaPerPorsi >= 25000) return false;
      if (
        priceRange === '25-35' &&
        (p.hargaPerPorsi < 25000 || p.hargaPerPorsi > 35000)
      ) {
        return false;
      }
      if (priceRange === 'diatas-35' && p.hargaPerPorsi <= 35000) return false;
      return true;
    });
  }, [activeProducts, priceRange, search, selectedJenis]);

  const hasActiveFilters =
    search.trim() !== '' || selectedJenis !== 'Semua' || priceRange !== 'semua';

  const resetFilters = () => {
    setSearch('');
    setSelectedJenis('Semua');
    setPriceRange('semua');
  };

  const handleOrderClick = (product: Product) => {
    if (!effectiveStoreStatus.isOpen) return;
    const draft = {
      items: [{ produkId: product.id, jumlahPorsi: 20 }],
      returnToAfterAuth: '/pesan',
    };
    setOrderDraft(draft);
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate('/pesan');
  };

  return (
    <CustomerLayout>
      {/* Hero Opener */}
      <section className="bg-leaf-motif border-b border-[#DCE5DA]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:py-14">
          <div className="lg:col-span-6 space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C5DEC1] bg-white/90 px-3.5 py-1 text-xs font-semibold text-[#245C3D]">
              <Utensils className="h-3.5 w-3.5 text-[#E8B84A]" aria-hidden="true" />
              Katering Masakan Rumahan Indonesia
            </span>
            <h1 className="font-brand text-3xl font-bold leading-tight text-[#243128] sm:text-4xl lg:text-[42px]">
              Pilihan katering untuk acara Anda
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#45544A]">
              Efdi Kitchen menyiapkan sajian nasi box, tumpeng mini, prasmanan,
              dan snack box rumahan dengan bahan segar, porsi tertata, dan jadwal
              pengambilan yang jelas untuk acara keluarga maupun kantor.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#katalog-paket"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-[10px] bg-[#245C3D] px-6 text-sm font-semibold text-white hover:bg-[#1B472E]"
              >
                Lihat Paket
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <Button
                variant="outline"
                onClick={() => navigate('/cek-pesanan')}
              >
                Cek Status Pesanan
              </Button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white shadow-sm">
              <img
                src="/images/hero-nasi-box.jpg"
                alt="Sajian nasi box katering masakan Indonesia Efdi Kitchen"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Brief Business Profile + Operational Status Banner */}
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 space-y-6">
        <StoreStatusBanner status={effectiveStoreStatus} />

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#DCE5DA] bg-[#F5F7F4] p-5 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF5EC] text-[#245C3D]">
              <ChefHat className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#243128]">
                Dimasak Segar Sesuai Jadwal
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[#55645A]">
                Setiap pesanan diproses setelah DP diverifikasi agar bahan dan
                kemasan disiapkan tepat waktu.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF5EC] text-[#245C3D]">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#243128]">
                Pemesanan Online Minimal H+1
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[#55645A]">
                Pesanan online dijadwalkan paling cepat untuk keesokan hari
                dengan waktu pengambilan dalam WIB.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF5EC] text-[#245C3D]">
              <Utensils className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#243128]">
                DP Minimum 50% &amp; Nota Digital
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[#55645A]">
                Nota digital terbit otomatis lengkap dengan kode pesanan untuk
                memantau proses hingga Siap Diambil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section
        id="katalog-paket"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-brand text-2xl font-bold text-[#243128] sm:text-3xl">
              Katalog Paket Katering
            </h2>
            <p className="mt-1 text-sm text-[#55645A]">
              Menampilkan {filteredProducts.length} dari {activeProducts.length}{' '}
              paket aktif tersedia.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#DCE5DA] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55645A]"
                aria-hidden="true"
              />
              <label htmlFor="catalog-search" className="sr-only">
                Cari paket katering
              </label>
              <input
                id="catalog-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama paket atau lauk (misal: ayam, rendang, tumpeng)..."
                className="min-h-[44px] w-full rounded-[10px] border border-[#CBD6C8] bg-white pl-10 pr-4 text-sm text-[#243128] placeholder:text-[#7E8D83] focus:border-[#245C3D]"
              />
            </div>
            {/* Mobile Filter Trigger */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[#CBD6C8] bg-[#EEF5EC] px-4 text-sm font-semibold text-[#245C3D] md:hidden cursor-pointer"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filter
            </button>
          </div>

          {/* Desktop/Tablet Filters */}
          <div className="hidden flex-wrap items-center justify-between gap-3 border-t border-[#EEF2EC] pt-3 md:flex">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter jenis paket">
              <span className="text-xs font-semibold text-[#55645A] mr-1">
                Jenis:
              </span>
              {JENIS_OPTIONS.map((jenis) => {
                const active = selectedJenis === jenis;
                return (
                  <button
                    key={jenis}
                    type="button"
                    onClick={() => setSelectedJenis(jenis)}
                    className={`min-h-[36px] rounded-full px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#245C3D] text-white'
                        : 'bg-[#F5F7F4] text-[#243128] hover:bg-[#EEF5EC]'
                    }`}
                  >
                    {jenis}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="filter-harga-desktop"
                className="text-xs font-semibold text-[#55645A]"
              >
                Harga:
              </label>
              <select
                id="filter-harga-desktop"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                className="min-h-[38px] rounded-[10px] border border-[#CBD6C8] bg-white px-3 text-xs font-medium text-[#243128]"
              >
                {PRICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Atur Ulang
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="mt-6">
          {isFiltering ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="Produk tidak ditemukan"
              description="Tidak ada paket aktif yang cocok dengan kata kunci atau filter yang dipilih."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Atur Ulang Filter
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <PackageCard
                  key={product.id}
                  product={product}
                  storeOpen={effectiveStoreStatus.isOpen}
                  onViewDetail={(p) => navigate(`/paket/${p.id}`)}
                  onOrder={handleOrderClick}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Mobile Filter Bottom Sheet */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filter Katalog"
        >
          <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF2EC] pb-3">
              <h3 className="text-base font-bold text-[#243128]">
                Filter Paket Katering
              </h3>
              <button
                type="button"
                aria-label="Tutup filter"
                onClick={() => setMobileFilterOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[#F5F7F4]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-5">
              <div>
                <p className="text-sm font-semibold text-[#243128]">
                  Jenis Paket
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {JENIS_OPTIONS.map((jenis) => {
                    const active = selectedJenis === jenis;
                    return (
                      <button
                        key={jenis}
                        type="button"
                        onClick={() => setSelectedJenis(jenis)}
                        className={`min-h-[40px] rounded-full px-4 text-xs font-semibold ${
                          active
                            ? 'bg-[#245C3D] text-white'
                            : 'bg-[#F5F7F4] text-[#243128]'
                        }`}
                      >
                        {jenis}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#243128]">
                  Rentang Harga per Porsi
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {PRICE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriceRange(opt.value)}
                      className={`flex min-h-[42px] items-center justify-between rounded-xl border px-3.5 text-sm font-medium ${
                        priceRange === opt.value
                          ? 'border-[#245C3D] bg-[#EEF5EC] text-[#245C3D]'
                          : 'border-[#DCE5DA] bg-white text-[#243128]'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  resetFilters();
                  setMobileFilterOpen(false);
                }}
              >
                Atur Ulang
              </Button>
              <Button
                variant="primary"
                onClick={() => setMobileFilterOpen(false)}
              >
                Terapkan Filter
              </Button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
};
