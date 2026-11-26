import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { Button, Input } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';

function createChallenge() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 1;
  return { a, b, answer: String(a + b) };
}

export const RegisterPage: React.FC = () => {
  const { registerCustomer, orderDraft, pushToast } = useApp();
  const navigate = useNavigate();

  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [challenge, setChallenge] = useState(() => createChallenge());
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaChecked, setCaptchaChecked] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const nextErrors: Record<string, string> = {};

    if (namaLengkap.trim().length < 2 || namaLengkap.trim().length > 100) {
      nextErrors.namaLengkap = 'Nama lengkap harus 2–100 karakter.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Masukkan alamat email yang valid.';
    }
    if (password.length < 8) {
      nextErrors.password = 'Kata sandi minimal 8 karakter.';
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Konfirmasi kata sandi tidak sama.';
    }
    if (!captchaChecked || captchaInput.trim() !== challenge.answer) {
      nextErrors.captcha =
        'Verifikasi CAPTCHA belum selesai atau jawaban tidak sesuai.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const res = registerCustomer({ namaLengkap, email, password });
    if (!res.ok) {
      setServerError(res.error || 'Registrasi gagal.');
      return;
    }

    pushToast({
      type: 'success',
      title: 'Pendaftaran Berhasil',
      message: `Selamat datang, ${namaLengkap.trim()}.`,
    });

    if (orderDraft?.returnToAfterAuth) {
      navigate(orderDraft.returnToAfterAuth, { replace: true });
    } else {
      navigate('/paket', { replace: true });
    }
  };

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="rounded-2xl border border-[#DCE5DA] bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-brand text-2xl font-bold text-[#243128] sm:text-3xl">
            Daftar Akun Pelanggan
          </h1>
          <p className="mt-1.5 text-sm text-[#55645A]">
            Buat akun untuk melakukan pemesanan katering dan memantau proses
            pesanan Anda.
          </p>

          {serverError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-3.5 text-sm text-[#B42318]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Input
              id="reg-nama"
              label="Nama Lengkap"
              required
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              placeholder="Contoh: Nadia Pratama"
              error={errors.namaLengkap}
            />

            <Input
              id="reg-email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              error={errors.email}
            />

            <Input
              id="reg-password"
              label="Kata Sandi"
              type={showPass ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              error={errors.password}
              rightAdornment={
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#55645A] hover:bg-[#F5F7F4] cursor-pointer"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              }
            />

            <Input
              id="reg-confirm"
              label="Konfirmasi Kata Sandi"
              type={showPass ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi"
              error={errors.confirmPassword}
            />

            {/* Local Simulated CAPTCHA */}
            <div
              className={`rounded-xl border p-4 ${
                errors.captcha
                  ? 'border-[#B42318] bg-[#FEF3F2]'
                  : 'border-[#DCE5DA] bg-[#F5F7F4]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#243128]">
                  <ShieldCheck className="h-4 w-4 text-[#245C3D]" aria-hidden="true" />
                  Verifikasi Keamanan (CAPTCHA Simulasi)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setChallenge(createChallenge());
                    setCaptchaInput('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#245C3D] hover:underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Ganti Soal
                </button>
              </div>

              <label className="mt-3 flex items-center gap-2.5 text-sm text-[#243128] cursor-pointer">
                <input
                  type="checkbox"
                  checked={captchaChecked}
                  onChange={(e) => setCaptchaChecked(e.target.checked)}
                  className="h-4 w-4 accent-[#245C3D]"
                />
                <span>Saya bukan bot otomatis</span>
                {captchaChecked && captchaInput.trim() === challenge.answer && (
                  <CheckCircle2 className="h-4 w-4 text-[#137333]" aria-hidden="true" />
                )}
              </label>

              <div className="mt-3 flex items-center gap-3">
                <label
                  htmlFor="captcha-ans"
                  className="text-sm font-semibold text-[#243128]"
                >
                  Berapa {challenge.a} + {challenge.b} ?
                </label>
                <input
                  id="captcha-ans"
                  type="text"
                  inputMode="numeric"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Hasil"
                  className="h-10 w-24 rounded-lg border border-[#CBD6C8] bg-white px-3 text-sm text-[#243128]"
                />
              </div>

              {errors.captcha && (
                <p role="alert" className="mt-2 text-xs font-medium text-[#B42318]">
                  {errors.captcha}
                </p>
              )}
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Daftar Sekarang
            </Button>
          </form>

          <p className="mt-5 border-t border-[#EEF2EC] pt-4 text-center text-sm text-[#55645A]">
            Sudah memiliki akun?{' '}
            <Link to="/login" className="font-semibold text-[#245C3D] hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
};
