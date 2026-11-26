import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { Button, Input } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import { renderRecaptcha } from '../../services/recaptcha';

export const RegisterPage: React.FC = () => {
  const { registerCustomer, orderDraft, pushToast } = useApp();
  const navigate = useNavigate();

  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement>(null);
  const resetCaptchaRef = useRef<(() => void) | null>(null);
  const destroyCaptchaRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = captchaContainerRef.current;
    if (!container) return;
    let active = true;

    void renderRecaptcha(
      container,
      (token) => {
        if (active) {
          setCaptchaToken(token);
          setCaptchaError('');
        }
      },
      (message) => {
        if (active) setCaptchaError(message);
      },
    )
      .then((captchaWidget) => {
        if (active) {
          resetCaptchaRef.current = captchaWidget.reset;
          destroyCaptchaRef.current = captchaWidget.destroy;
        } else {
          captchaWidget.destroy();
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setCaptchaError(error instanceof Error ? error.message : 'CAPTCHA gagal dimuat.');
        }
      });

    return () => {
      active = false;
      destroyCaptchaRef.current?.();
      resetCaptchaRef.current = null;
      destroyCaptchaRef.current = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setCaptchaError('');
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
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!captchaToken) {
      setCaptchaError('Centang kotak “I’m not a robot” sebelum mendaftar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerCustomer({ namaLengkap, email, password, captchaToken });
      if (!res.ok) {
        setServerError(res.error || 'Registrasi gagal.');
        setCaptchaToken('');
        resetCaptchaRef.current?.();
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
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Verifikasi reCAPTCHA gagal.');
      setCaptchaToken('');
      resetCaptchaRef.current?.();
    } finally {
      setIsSubmitting(false);
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

            <div className="rounded-xl border border-[#DCE5DA] bg-[#F5F7F4] p-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#243128]">
                <ShieldCheck className="h-4 w-4 text-[#245C3D]" aria-hidden="true" />
                Pendaftaran dilindungi Google reCAPTCHA.
              </span>
              <div className="mt-3 min-h-[78px]" ref={captchaContainerRef} />
              {captchaError && (
                <p role="alert" className="mt-2 text-xs font-medium text-[#B42318]">
                  {captchaError}
                </p>
              )}
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Memverifikasi dan mendaftar...' : 'Daftar Sekarang'}
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
