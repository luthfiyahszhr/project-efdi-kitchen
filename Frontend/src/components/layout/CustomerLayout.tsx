import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Leaf,
  LogIn,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, logout, effectiveStoreStatus } = useApp();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-[#EEF5EC] text-[#245C3D]'
        : 'text-[#243128] hover:bg-[#F5F7F4]'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#243128]">
      <header className="sticky top-0 z-40 border-b border-[#DCE5DA] bg-white/95 backdrop-blur-xs no-print">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/paket"
            className="flex items-center gap-2.5 rounded-lg py-1 focus-visible:outline-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#245C3D] text-white">
              <Leaf className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-brand text-xl font-bold tracking-tight text-[#245C3D]">
              Efdi Kitchen
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            aria-label="Navigasi Pelanggan"
            className="hidden items-center gap-1.5 md:flex"
          >
            <NavLink to="/paket" className={navLinkClass}>
              Katalog
            </NavLink>
            <NavLink to="/cek-pesanan" className={navLinkClass}>
              Cek Pesanan
            </NavLink>
            {(currentUser?.role === 'Admin' || currentUser?.role === 'Owner') && (
              <NavLink to="/admin" className={navLinkClass}>
                <LayoutDashboard className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Dashboard
              </NavLink>
            )}
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                effectiveStoreStatus.isOpen
                  ? 'bg-[#EEF5EC] text-[#245C3D]'
                  : 'bg-[#FEF7E0] text-[#855800]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  effectiveStoreStatus.isOpen ? 'bg-[#245C3D]' : 'bg-[#9A6700]'
                }`}
              />
              {effectiveStoreStatus.isOpen ? 'Buka' : 'Tutup'}
            </span>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="max-w-[160px] truncate text-sm font-medium text-[#55645A]">
                  {currentUser.namaLengkap}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/paket');
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] border border-[#CBD6C8] bg-white px-3.5 text-sm font-semibold text-[#243128] hover:bg-[#F5F7F4] cursor-pointer"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Keluar
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] bg-[#245C3D] px-4 text-sm font-semibold text-white hover:bg-[#1B472E]"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Masuk
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#DCE5DA] text-[#243128] md:hidden cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="border-t border-[#EEF2EC] bg-white px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1.5" aria-label="Menu Mobile">
              <NavLink
                to="/paket"
                className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                Katalog
              </NavLink>
              <NavLink
                to="/cek-pesanan"
                className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                Cek Pesanan
              </NavLink>
              {(currentUser?.role === 'Admin' ||
                currentUser?.role === 'Owner') && (
                <NavLink
                  to="/admin"
                  className={navLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Dashboard Pengelola
                </NavLink>
              )}
              <div className="my-1.5 border-t border-[#EEF2EC]" />
              {currentUser ? (
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="text-sm">
                    <p className="font-semibold text-[#243128]">
                      {currentUser.namaLengkap}
                    </p>
                    <p className="text-xs text-[#55645A]">{currentUser.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                      navigate('/paket');
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] border border-[#CBD6C8] px-3.5 text-sm font-semibold text-[#243128]"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Keluar
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[10px] bg-[#245C3D] px-4 text-sm font-semibold text-white"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Masuk
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-12 border-t border-[#DCE5DA] bg-[#F5F7F4] py-8 no-print">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="font-brand text-lg font-bold text-[#245C3D]">
              Efdi Kitchen
            </p>
            <p className="mt-0.5 text-xs text-[#55645A]">
              Katering masakan rumahan Indonesia — Sistem Informasi Operasional &amp; Katalog Online
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-[#55645A]">
            <Link to="/paket" className="hover:text-[#245C3D]">
              Katalog Paket
            </Link>
            <Link to="/cek-pesanan" className="hover:text-[#245C3D]">
              Cek Pesanan
            </Link>
            <Link to="/login" className="hover:text-[#245C3D]">
              Masuk Akun
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
