import React, { useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  SearchX,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from './FormControls';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  const styles = {
    success: {
      wrap: 'border-[#A8DAB5] bg-[#E6F4EA] text-[#137333]',
      icon: <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />,
    },
    warning: {
      wrap: 'border-[#F3D88C] bg-[#FEF7E0] text-[#855800]',
      icon: <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />,
    },
    error: {
      wrap: 'border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]',
      icon: <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />,
    },
    info: {
      wrap: 'border-[#C5DEC1] bg-[#EEF5EC] text-[#245C3D]',
      icon: <Info className="h-5 w-5 shrink-0" aria-hidden="true" />,
    },
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => {
        const s = styles[t.type];
        return (
          <div
            key={t.id}
            role="status"
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-md ${s.wrap}`}
          >
            {s.icon}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.message && (
                <p className="mt-0.5 text-xs opacity-90">{t.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Tutup notifikasi"
              className="rounded-md p-1 hover:bg-black/5 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-2xl border border-[#DCE5DA] bg-white p-6 shadow-xl`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#EEF2EC] pb-4">
          <h2 className="text-lg font-bold text-[#243128]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#55645A] hover:bg-[#F5F7F4] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
}) => (
  <Modal open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
    <div className="text-sm leading-relaxed text-[#243128]">{description}</div>
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <Button variant="outline" onClick={onClose}>
        {cancelLabel}
      </Button>
      <Button
        variant={danger ? 'danger' : 'primary'}
        onClick={() => {
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD6C8] bg-[#F5F7F4]/60 px-6 py-12 text-center">
    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF5EC] text-[#245C3D]">
      {icon ?? <SearchX className="h-6 w-6" aria-hidden="true" />}
    </div>
    <h3 className="text-base font-bold text-[#243128]">{title}</h3>
    {description && (
      <p className="mt-1.5 max-w-md text-sm text-[#55645A]">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Terjadi Kendala', message, onRetry }) => (
  <div
    role="alert"
    className="flex flex-col items-center justify-center rounded-2xl border border-[#FECDCA] bg-[#FEF3F2] px-6 py-10 text-center"
  >
    <XCircle className="mb-3 h-10 w-10 text-[#B42318]" aria-hidden="true" />
    <h3 className="text-base font-bold text-[#B42318]">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-[#7A271A]">{message}</p>
    {onRetry && (
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        Coba Lagi
      </Button>
    )}
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="animate-pulse overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white">
    <div className="aspect-[4/3] w-full bg-[#E5ECE3]" />
    <div className="space-y-3 p-5">
      <div className="h-5 w-2/3 rounded bg-[#E5ECE3]" />
      <div className="h-4 w-full rounded bg-[#EEF3EC]" />
      <div className="h-4 w-4/5 rounded bg-[#EEF3EC]" />
      <div className="pt-2 flex justify-between items-center">
        <div className="h-6 w-24 rounded bg-[#E5ECE3]" />
        <div className="h-10 w-24 rounded-lg bg-[#E5ECE3]" />
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="animate-pulse space-y-3 rounded-2xl border border-[#DCE5DA] bg-white p-5">
    <div className="h-8 w-full rounded bg-[#EEF3EC]" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 w-full rounded bg-[#F5F7F4]" />
    ))}
  </div>
);
