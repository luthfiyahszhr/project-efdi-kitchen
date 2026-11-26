import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  Leaf,
  Lock,
} from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { Button, Input } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';

export const LoginPage: React.FC = () => {
  const {
    login,
    orderDraft,
    failedLoginAttempts,
    isAccountLocked,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fromState = (location.state as { from?: string } | null)?.from;
  const isLocked = isAccountLocked;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim() || !password) {
      setErrorMsg('Email/username dan kata sandi wajib diisi.');
      return;
    }

    const res = login(identifier, password);
    if (!res.ok || !res.user) {
      setErrorMsg(res.error || 'Email/username atau kata sandi tidak sesuai.');
      return;
    }

    // Role determined by account: Admin/Owner -> /admin; Customer -> /pesan (if from Pesan) or /paket
    if (res.user.role === 'Admin' || res.user.role === 'Owner') {
      navigate('/admin', { replace: true });
      return;
    }

    if (orderDraft?.returnToAfterAuth) {
      navigate(orderDraft.returnToAfterAuth, { replace: true });
      return;
    }

    if (fromState && fromState !== '/login' && fromState !== '/register') {
      navigate(fromState, { replace: true });
      return;
    }

    navigate('/paket', { replace: true });
  };

  const fillDemo = (idVal: string, pwVal: string) => {
    setIdentifier(idVal);
    setPassword(pwVal);
    setErrorMsg('');
  };

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white shadow-sm lg:grid-cols-12">
          {/* Left supportive food photography */}
          <div className="relative hidden bg-[#EEF5EC] lg:col-span-5 lg:block">
            <img
              src="/images/login-catering.jpg"
              alt="Hidangan katering Efdi Kitchen siap saji"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#243128]/75 via-[#243128]/20 to-transparent p-6 flex flex-col justify-end text-white">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#245C3D]">
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                Efdi Kitchen
              </div>
              <p className="font-brand mt-3 text-xl font-bold leading-snug">
                Satu pintu masuk untuk pelanggan maupun pengelola dapur.
              </p>
            </div>
          </div>

          {/* Right Form */}
          <div className="p-6 sm:p-8 lg:col-span-7">
            <h1 className="font-brand text-2xl font-bold text-[#243128] sm:text-3xl">
              Masuk ke Akun
            </h1>
            <p className="mt-1.5 text-sm text-[#55645A]">
              Masuk untuk membuat pesanan katering, mengunggah bukti pembayaran,
              atau mengelola operasional dapur.
            </p>

            {orderDraft && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#C5DEC1] bg-[#EEF5EC] p-3.5 text-xs text-[#245C3D]">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Silakan masuk terlebih dahulu. Pilihan paket Anda akan tetap
                  tersimpan dan langsung dilanjutkan ke formulir pemesanan.
                </span>
              </div>
            )}

            {isLocked && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-sm text-[#B42318]"
              >
                <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-bold">Akun Terkunci Sementara (15 Menit)</p>
                  <p className="mt-0.5 text-xs">
                    Terdapat 5 kegagalan masuk berturut-turut. Demi keamanan,
                    percobaan masuk ditahan selama 15 menit.
                  </p>
                </div>
              </div>
            )}

            {errorMsg && !isLocked && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-3.5 text-sm text-[#B42318]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">{errorMsg}</p>
                  {failedLoginAttempts > 0 && failedLoginAttempts < 5 && (
                    <p className="mt-0.5 text-xs">
                      Percobaan gagal: {failedLoginAttempts} dari 5 sebelum akun
                      dikunci 15 menit.
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <Input
                id="login-identifier"
                label="Email atau Username"
                type="text"
                required
                autoComplete="username"
                placeholder="nama@email.com atau username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />

              <Input
                id="login-password"
                label="Kata Sandi"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? 'Sembunyikan kata sandi'
                        : 'Tampilkan kata sandi'
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#55645A] hover:bg-[#F5F7F4] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />

              <Button type="submit" variant="primary" className="w-full" disabled={isLocked}>
                Masuk
              </Button>
            </form>

            <div className="mt-5 space-y-2 border-t border-[#EEF2EC] pt-4 text-sm">
              <p className="text-[#243128]">
                Belum punya akun pelanggan?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#245C3D] hover:underline"
                >
                  Daftar
                </Link>
              </p>
              <p className="text-xs text-[#55645A]">
                Lupa kata sandi? Silakan hubungi pengelola Efdi Kitchen untuk
                bantuan pengaturan ulang kata sandi akun Anda.
              </p>
            </div>

            {/* Prototype Helper Card */}
            <div className="mt-6 rounded-xl border border-[#DCE5DA] bg-[#F5F7F4] p-4">
              <p className="text-xs font-bold text-[#243128]">
                Akun Demonstrasi Prototipe (Peran ditentukan otomatis oleh akun)
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('budi.santoso@gmail.com', 'customer123')}
                  className="rounded-lg border border-[#CBD6C8] bg-white px-3 py-1.5 text-xs font-semibold text-[#243128] hover:bg-[#EEF5EC] cursor-pointer"
                >
                  Customer (Budi)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('admin1', 'admin123')}
                  className="rounded-lg border border-[#CBD6C8] bg-white px-3 py-1.5 text-xs font-semibold text-[#243128] hover:bg-[#EEF5EC] cursor-pointer"
                >
                  Admin (admin1)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('owner', 'owner123')}
                  className="rounded-lg border border-[#CBD6C8] bg-white px-3 py-1.5 text-xs font-semibold text-[#243128] hover:bg-[#EEF5EC] cursor-pointer"
                >
                  Owner (owner)
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[#55645A]">
                Sesi aktif akan berakhir otomatis setelah 60 menit tidak ada aktivitas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};
