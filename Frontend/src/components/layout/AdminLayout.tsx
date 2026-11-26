import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  ChefHat,
  ClipboardList,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Package,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AdminLayout: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, actions, children }) => {
  const { currentUser, logout, payments, effectiveStoreStatus } = useApp();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pendingPaymentsCount = payments.filter(
    (p) => p.status === 'Menunggu Verifikasi'
  ).length;

  const isOwner = currentUser?.role === 'Owner';

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/pesanan', label: 'Daftar Pesanan', icon: ClipboardList },
    {
      to: '/admin/pembayaran',
      label: 'Verifikasi Pembayaran',
      icon: CreditCard,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
    },
    { to: '/admin/produk', label: 'Kelola Katalog', icon: Package },
    { to: '/admin/kebutuhan', label: 'Kebutuhan Produksi', icon: ChefHat },
    { to: '/admin/stok', label: 'Kelola Stok', icon: Boxes },
    { to: '/admin/pengaturan', label: 'Pengaturan Operasional', icon: Settings },
    { to: '/admin/customer', label: 'Akun Customer', icon: Users },
    ...(isOwner
      ? [{ to: '/admin/laporan', label: 'Rekap Laporan', icon: BarChart3 }]
      : []),
  ];

  const renderNav = (onSelect?: () => void) => (
    <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Menu Pengelola">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onSelect}
            className={({ isActive }) =>
              `flex items-center justify-between gap-2 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-[#245C3D] text-white'
                  : 'text-[#243128] hover:bg-[#EEF5EC]'
              }`
            }
          >
            <span className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </span>
            {item.badge !== undefined && (
              <span className="rounded-full bg-[#E8B84A] px-2 py-0.5 text-xs font-bold text-[#243128]">
                {item.badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F7F4] text-[#243128]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#DCE5DA] bg-white lg:flex no-print">
        <div className="flex h-16 items-center gap-2.5 border-b border-[#EEF2EC] px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#245C3D] text-white">
            <Leaf className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-brand text-base font-bold text-[#245C3D]">
              Efdi Kitchen
            </p>
            <p className="text-[11px] font-medium text-[#55645A]">
              Operasional ({currentUser?.role})
            </p>
          </div>
        </div>

        {renderNav()}

        <div className="border-t border-[#EEF2EC] p-3 space-y-2">
          <Link
            to="/paket"
            className="flex items-center justify-between rounded-[10px] border border-[#DCE5DA] bg-[#F5F7F4] px-3.5 py-2.5 text-xs font-semibold text-[#243128] hover:bg-[#EEF5EC]"
          >
            <span>Lihat Katalog Pelanggan</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex w-full items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-[#B42318] hover:bg-[#FEF3F2] cursor-pointer"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-[#EEF2EC] px-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#245C3D] text-white">
                  <Leaf className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-brand text-base font-bold text-[#245C3D]">
                    Efdi Kitchen
                  </p>
                  <p className="text-[11px] text-[#55645A]">
                    {currentUser?.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup navigasi"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#F5F7F4]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {renderNav(() => setDrawerOpen(false))}
            <div className="border-t border-[#EEF2EC] p-3 space-y-2">
              <Link
                to="/paket"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-between rounded-[10px] border border-[#DCE5DA] px-3.5 py-2.5 text-xs font-semibold"
              >
                <span>Katalog Pelanggan</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="flex w-full items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-[#B42318] hover:bg-[#FEF3F2]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Keluar
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[#DCE5DA] bg-white px-4 sm:px-6 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Buka menu navigasi"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCE5DA] text-[#243128] lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-[#243128] sm:text-lg">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden truncate text-xs text-[#55645A] sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
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
              {effectiveStoreStatus.isOpen ? 'Toko Buka' : 'Toko Tutup'}
            </span>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-[#243128]">
                {currentUser?.namaLengkap}
              </p>
              <p className="text-[11px] text-[#55645A]">{currentUser?.role}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {actions && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="sm:hidden">
                  {subtitle && (
                    <p className="text-xs text-[#55645A]">{subtitle}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {actions}
                </div>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
