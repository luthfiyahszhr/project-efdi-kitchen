import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  UploadCloud,
  UtensilsCrossed,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import type { Order, OrderStatus, Product } from '../../types/domain';
import { formatRupiah, formatTanggalWaktuWib } from '../../utils/format';
import { Button } from './FormControls';
import { Modal } from './Feedback';

export const FoodPlaceholder: React.FC<{
  label?: string;
  className?: string;
}> = ({ label = 'Foto paket katering', className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center bg-[#EEF5EC] text-[#245C3D] ${className}`}
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-xs">
      <UtensilsCrossed className="h-7 w-7" aria-hidden="true" />
    </div>
    <span className="mt-2 px-3 text-center text-xs font-medium text-[#55645A]">
      {label}
    </span>
  </div>
);

export const ProductPhoto: React.FC<{
  src?: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <FoodPlaceholder label={alt} className={className} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
};

export const PackageCard: React.FC<{
  product: Product;
  storeOpen: boolean;
  onViewDetail: (product: Product) => void;
  onOrder: (product: Product) => void;
}> = ({ product, storeOpen, onViewDetail, onOrder }) => (
  <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white shadow-xs transition-shadow hover:shadow-md">
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EEF5EC]">
      <ProductPhoto
        src={product.fotoUrl}
        alt={product.nama}
        className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#245C3D] shadow-xs">
        {product.jenis}
      </span>
    </div>

    <div className="flex flex-1 flex-col p-5">
      <h3 className="text-lg font-bold text-[#243128]">{product.nama}</h3>
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-[#55645A]">
        {product.ringkasanIsi}
      </p>

      <div className="mt-4 border-t border-[#EEF2EC] pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-[#55645A]">Harga per porsi</span>
          <span className="text-lg font-bold text-[#245C3D]">
            {formatRupiah(product.hargaPerPorsi)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetail(product)}
            className="w-full"
          >
            Lihat Detail
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!storeOpen}
            title={
              storeOpen
                ? `Pesan ${product.nama}`
                : 'Pemesanan sedang ditutup'
            }
            onClick={() => onOrder(product)}
            className="w-full"
          >
            Pesan
          </Button>
        </div>
      </div>
    </div>
  </article>
);

const PRODUCTION_STEPS: OrderStatus[] = [
  'Menunggu DP',
  'Pesanan Baru',
  'Mulai Dimasak',
  'Sedang Dipacking',
  'Siap Diambil',
  'Pesanan Selesai',
];

export const OrderTimeline: React.FC<{ order: Order }> = ({ order }) => {
  const isCancelled = order.statusPesanan === 'Dibatalkan';
  const currentIdx = PRODUCTION_STEPS.indexOf(order.statusPesanan);

  const reachedSet = new Set(order.riwayatStatus.map((h) => h.status));
  const cancelEntry = order.riwayatStatus.find((h) => h.status === 'Dibatalkan');

  return (
    <div className="space-y-4">
      {isCancelled && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#B42318]" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-[#B42318]">
              Pesanan Dibatalkan (Kondisi Akhir Alternatif)
            </p>
            {order.alasanPembatalan && (
              <p className="mt-1 text-sm text-[#7A271A]">
                Alasan: {order.alasanPembatalan}
              </p>
            )}
            {cancelEntry && (
              <p className="mt-1 text-xs text-[#7A271A]">
                Waktu pembatalan: {formatTanggalWaktuWib(cancelEntry.waktuWib)}
              </p>
            )}
          </div>
        </div>
      )}

      <ol className="relative space-y-4 border-l-2 border-[#DCE5DA] pl-5 ml-2.5">
        {PRODUCTION_STEPS.map((step, index) => {
          const historyMatch = [...order.riwayatStatus]
            .reverse()
            .find((h) => h.status === step);
          const isReached = isCancelled
            ? reachedSet.has(step)
            : index <= currentIdx;
          const isActive = !isCancelled && index === currentIdx;

          return (
            <li key={step} className="relative">
              <span
                className={`absolute -left-[29px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  isActive
                    ? 'border-[#245C3D] bg-[#245C3D] text-white ring-4 ring-[#EEF5EC]'
                    : isReached
                    ? 'border-[#245C3D] bg-[#EEF5EC] text-[#245C3D]'
                    : 'border-[#CBD6C8] bg-white text-[#9AA69E]'
                }`}
              >
                {isReached ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Clock className="h-3 w-3" aria-hidden="true" />
                )}
              </span>

              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p
                  className={`text-sm font-semibold ${
                    isActive
                      ? 'text-[#245C3D]'
                      : isReached
                      ? 'text-[#243128]'
                      : 'text-[#7E8D83]'
                  }`}
                >
                  {step}
                  {isActive && (
                    <span className="ml-2 rounded-full bg-[#EEF5EC] px-2 py-0.5 text-[11px] font-semibold text-[#245C3D]">
                      Tahap Aktif
                    </span>
                  )}
                </p>
                {historyMatch && (
                  <span className="text-xs text-[#55645A]">
                    {formatTanggalWaktuWib(historyMatch.waktuWib)}
                  </span>
                )}
              </div>
              {historyMatch?.keterangan && (
                <p className="mt-0.5 text-xs text-[#55645A]">
                  {historyMatch.keterangan}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

interface UploadAreaProps {
  id: string;
  label: string;
  maxSizeMb: number;
  valueUrl?: string;
  fileName?: string;
  error?: string;
  disabled?: boolean;
  onFileSelected: (dataUrl: string, fileName: string) => void;
  onClear: () => void;
  onError: (msg: string) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({
  id,
  label,
  maxSizeMb,
  valueUrl,
  fileName,
  error,
  disabled,
  onFileSelected,
  onClear,
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type.toLowerCase())) {
      onError('Format file harus JPG, JPEG, atau PNG.');
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      onError(`Ukuran file maksimal ${maxSizeMb} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onFileSelected(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-[#243128]">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        disabled={disabled}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
        className="sr-only"
      />

      {!valueUrl ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
            error
              ? 'border-[#B42318] bg-[#FEF3F2]'
              : 'border-[#CBD6C8] bg-[#F5F7F4] hover:border-[#245C3D] hover:bg-[#EEF5EC]'
          }`}
        >
          <UploadCloud className="h-8 w-8 text-[#245C3D]" aria-hidden="true" />
          <span className="mt-2 text-sm font-semibold text-[#243128]">
            Pilih file gambar untuk diunggah
          </span>
          <span className="mt-1 text-xs text-[#55645A]">
            Format JPG, JPEG, atau PNG • Maksimal {maxSizeMb} MB
          </span>
        </button>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#DCE5DA] bg-white">
          <div className="relative bg-[#F5F7F4]">
            <img
              src={valueUrl}
              alt={fileName || 'Pratinjau gambar'}
              className="mx-auto max-h-64 w-full object-contain"
            />
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#243128] shadow-sm hover:bg-white cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
              Perbesar
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2EC] px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon className="h-4 w-4 shrink-0 text-[#245C3D]" aria-hidden="true" />
              <span className="truncate text-xs font-medium text-[#243128]">
                {fileName || 'Gambar terpilih'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Ganti
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={onClear}
                className="text-[#B42318] hover:bg-[#FEF3F2]"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-[#B42318]">
          {error}
        </p>
      )}

      <Modal
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        title={fileName || 'Pratinjau Gambar'}
        maxWidthClass="max-w-2xl"
      >
        {valueUrl && (
          <img
            src={valueUrl}
            alt={fileName || 'Pratinjau penuh'}
            className="mx-auto max-h-[70vh] w-full rounded-lg object-contain bg-[#F5F7F4]"
          />
        )}
      </Modal>
    </div>
  );
};

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#EEF2EC] pt-4">
      <p className="text-xs text-[#55645A]">
        Halaman <strong className="text-[#243128]">{page}</strong> dari{' '}
        <strong className="text-[#243128]">{totalPages}</strong>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          Berikutnya
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
