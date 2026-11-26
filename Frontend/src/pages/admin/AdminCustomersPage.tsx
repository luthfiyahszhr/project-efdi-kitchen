import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ConfirmDialog, EmptyState, Modal } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import type { UserAccount } from '../../types/domain';

export const AdminCustomersPage: React.FC = () => {
  const { users, resetCustomerPassword, pushToast } = useApp();

  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<UserAccount | null>(null);
  // Stored ONLY in local component state for one-time display, never in browser storage!
  const [oneTimeTempPassword, setOneTimeTempPassword] = useState<string | null>(
    null
  );
  const [oneTimeEmail, setOneTimeEmail] = useState<string>('');

  const customers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.role === 'Customer')
      .filter((u) => {
        if (!q) return true;
        return (
          u.namaLengkap.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.idKode.toLowerCase().includes(q)
        );
      });
  }, [users, search]);

  const handleConfirmReset = () => {
    if (!confirmTarget) return;
    const targetEmail = confirmTarget.email;
    const res = resetCustomerPassword(confirmTarget.id);
    setConfirmTarget(null);

    if (!res.ok || !res.tempPassword) {
      pushToast({
        type: 'error',
        title: 'Gagal Reset Password',
        message: res.error,
      });
      return;
    }

    setOneTimeEmail(targetEmail);
    setOneTimeTempPassword(res.tempPassword);
  };

  const handleCloseOneTimeModal = () => {
    // Discard temporary password completely once closed
    setOneTimeTempPassword(null);
    setOneTimeEmail('');
  };

  const copyTempPassword = async () => {
    if (!oneTimeTempPassword) return;
    try {
      await navigator.clipboard.writeText(oneTimeTempPassword);
      pushToast({
        type: 'success',
        title: 'Password Sementara Disalin',
        message: 'Segera serahkan kepada pelanggan.',
      });
    } catch {
      pushToast({
        type: 'info',
        title: 'Salin Manual',
        message: 'Silakan salin password sementara dari layar dialog.',
      });
    }
  };

  return (
    <AdminLayout
      title="Kelola Akun Customer"
      subtitle="Cari akun Customer dan bantu reset password bagi Customer aktif."
    >
      <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5">
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55645A]"
            aria-hidden="true"
          />
          <label htmlFor="customer-search" className="sr-only">
            Cari nama atau email customer
          </label>
          <input
            id="customer-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email customer..."
            className="min-h-[44px] w-full rounded-[10px] border border-[#CBD6C8] bg-white pl-10 pr-4 text-sm text-[#243128] focus:border-[#245C3D]"
          />
        </div>
      </section>

      {customers.length === 0 ? (
        <EmptyState
          title="Akun customer tidak ditemukan"
          description="Ubah kata kunci pencarian nama atau email."
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-[#EEF5EC] text-xs font-semibold text-[#243128]">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Nama Lengkap</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Status Aktif</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EC]">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#245C3D]">
                      {c.idKode}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#243128]">
                      {c.namaLengkap}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#55645A]">
                      {c.email}
                    </td>
                    <td className="px-4 py-3">
                      {c.aktif ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#A8DAB5] bg-[#E6F4EA] px-2.5 py-1 text-xs font-semibold text-[#137333]">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!c.aktif}
                        title={
                          c.aktif
                            ? 'Reset password untuk akun ini'
                            : 'Reset password hanya tersedia untuk Customer aktif'
                        }
                        onClick={() => setConfirmTarget(c)}
                      >
                        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                        Reset Password
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        title="Konfirmasi Reset Password Customer"
        confirmLabel="Ya, Buat Password Sementara"
        description={
          confirmTarget && (
            <div className="space-y-2">
              <p>
                Anda akan mengatur ulang kata sandi untuk akun Customer berikut:
              </p>
              <div className="rounded-xl bg-[#F5F7F4] p-3 text-xs">
                <p>
                  <strong>Nama:</strong> {confirmTarget.namaLengkap}
                </p>
                <p>
                  <strong>Email Tujuan:</strong> {confirmTarget.email}
                </p>
              </div>
              <p className="text-xs text-[#55645A]">
                Password sementara hanya ditampilkan satu kali setelah
                konfirmasi dan tidak disimpan di penyimpanan browser.
              </p>
            </div>
          )
        }
        onConfirm={handleConfirmReset}
      />

      {/* One-Time Password Display Dialog */}
      <Modal
        open={Boolean(oneTimeTempPassword)}
        onClose={handleCloseOneTimeModal}
        title="Password Sementara (Tampil Satu Kali)"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-[#F3D88C] bg-[#FEF7E0] p-3.5 text-xs text-[#855800]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Catat atau salin password sementara di bawah ini sekarang. Setelah
              dialog ditutup, password tidak dapat ditampilkan kembali.
            </span>
          </div>

          <div className="text-xs text-[#55645A]">
            Email tujuan:{' '}
            <strong className="text-[#243128]">{oneTimeEmail}</strong>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#C5DEC1] bg-[#EEF5EC] px-4 py-3">
            <code className="font-mono text-lg font-bold text-[#245C3D]">
              {oneTimeTempPassword}
            </code>
            <Button variant="secondary" size="sm" onClick={copyTempPassword}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Salin
            </Button>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" onClick={handleCloseOneTimeModal}>
              Selesai &amp; Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
