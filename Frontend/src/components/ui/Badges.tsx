import React from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChefHat,
  Clock,
  PackageCheck,
  PackageOpen,
  Receipt,
  Store,
  XCircle,
} from 'lucide-react';
import type {
  EffectiveStoreStatus,
  OrderStatus,
  PaymentRecordStatus,
  PaymentStatus,
} from '../../types/domain';

export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const styles: Record<
    OrderStatus,
    { bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    'Menunggu DP': {
      bg: 'bg-[#FEF7E0]',
      text: 'text-[#855800]',
      border: 'border-[#F3D88C]',
      icon: <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    'Pesanan Baru': {
      bg: 'bg-[#EFF6FF]',
      text: 'text-[#1E40AF]',
      border: 'border-[#BFDBFE]',
      icon: <Receipt className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    'Mulai Dimasak': {
      bg: 'bg-[#FFF3E6]',
      text: 'text-[#9A3412]',
      border: 'border-[#FED7AA]',
      icon: <ChefHat className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    'Sedang Dipacking': {
      bg: 'bg-[#EEF5EC]',
      text: 'text-[#245C3D]',
      border: 'border-[#C5DEC1]',
      icon: <PackageOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    'Siap Diambil': {
      bg: 'bg-[#E6F4EA]',
      text: 'text-[#137333]',
      border: 'border-[#A8DAB5]',
      icon: <PackageCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    'Pesanan Selesai': {
      bg: 'bg-[#245C3D]',
      text: 'text-white',
      border: 'border-[#245C3D]',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    Dibatalkan: {
      bg: 'bg-[#FEF3F2]',
      text: 'text-[#B42318]',
      border: 'border-[#FECDCA]',
      icon: <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
  };

  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text} ${s.border}`}
    >
      {s.icon}
      <span>{status}</span>
    </span>
  );
};

export const PaymentStatusBadge: React.FC<{
  status: PaymentStatus;
  hasPendingPelunasan?: boolean;
}> = ({ status, hasPendingPelunasan }) => {
  const styles: Record<
    PaymentStatus,
    { bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    'Belum Bayar': {
      bg: 'bg-[#FEF3F2]',
      text: 'text-[#B42318]',
      border: 'border-[#FECDCA]',
      icon: <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    'Menunggu Verifikasi': {
      bg: 'bg-[#FEF7E0]',
      text: 'text-[#855800]',
      border: 'border-[#F3D88C]',
      icon: <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    'DP Diterima': {
      bg: 'bg-[#EEF5EC]',
      text: 'text-[#245C3D]',
      border: 'border-[#C5DEC1]',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    Lunas: {
      bg: 'bg-[#E6F4EA]',
      text: 'text-[#137333]',
      border: 'border-[#A8DAB5]',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
  };

  const s = styles[status];
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text} ${s.border}`}
      >
        {s.icon}
        <span>{status}</span>
      </span>
      {hasPendingPelunasan && status === 'DP Diterima' && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#855800]">
          <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
          Bukti pelunasan menunggu verifikasi
        </span>
      )}
    </div>
  );
};

export const PaymentRecordBadge: React.FC<{ status: PaymentRecordStatus }> = ({
  status,
}) => {
  const map: Record<
    PaymentRecordStatus,
    { cls: string; icon: React.ReactNode }
  > = {
    'Menunggu Verifikasi': {
      cls: 'bg-[#FEF7E0] text-[#855800] border-[#F3D88C]',
      icon: <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    Diterima: {
      cls: 'bg-[#E6F4EA] text-[#137333] border-[#A8DAB5]',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    Ditolak: {
      cls: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
      icon: <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    VOID: {
      cls: 'bg-neutral-100 text-neutral-600 border-neutral-300',
      icon: <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
  };
  const cfg = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${cfg.cls}`}
    >
      {cfg.icon}
      <span>{status}</span>
    </span>
  );
};

export const StoreStatusBanner: React.FC<{
  status: EffectiveStoreStatus;
  compact?: boolean;
}> = ({ status, compact = false }) => {
  if (status.isOpen) {
    return (
      <div
        role="status"
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C5DEC1] bg-[#EEF5EC] ${
          compact ? 'px-4 py-2.5' : 'px-5 py-3.5'
        } text-[#243128]`}
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#245C3D] text-white">
            <Store className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#245C3D] px-2.5 py-0.5 text-xs font-semibold text-white">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Pemesanan Buka
              </span>
              <span className="text-xs font-medium text-[#55645A]">
                Mode: {status.mode}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[#243128]">{status.reasonText}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F3D88C] bg-[#FEF7E0] ${
        compact ? 'px-4 py-2.5' : 'px-5 py-4'
      } text-[#243128]`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8B84A] text-[#243128]">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#9A6700] px-2.5 py-0.5 text-xs font-semibold text-white">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Pemesanan Tutup
            </span>
            <span className="text-xs font-medium text-[#724E00]">
              Mode: {status.mode}
            </span>
          </div>
          {status.nextOpenText ? (
            <p className="mt-1 text-sm text-[#243128]">
              {status.reasonText} Jadwal buka berikutnya:{' '}
              <strong className="font-semibold">{status.nextOpenText}</strong>.
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#243128]">
              Pemesanan sedang ditutup. Silakan hubungi pengelola untuk informasi
              lebih lanjut.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
