import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { ToastContainer } from './components/ui/Feedback';
import { AppProvider, useApp } from './context/AppContext';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminNeedsPage } from './pages/admin/AdminNeedsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminStockPage } from './pages/admin/AdminStockPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CatalogPage } from './pages/customer/CatalogPage';
import { CheckOrderPage } from './pages/customer/CheckOrderPage';
import { OrderFormPage } from './pages/customer/OrderFormPage';
import { OrderStatusPage } from './pages/customer/OrderStatusPage';
import { OrderSummaryPage } from './pages/customer/OrderSummaryPage';
import { PackageDetailPage } from './pages/customer/PackageDetailPage';
import { PaymentUploadPage } from './pages/customer/PaymentUploadPage';
import type { Role } from './types/domain';

const RequireAuth: React.FC<{
  allowedRoles?: Role[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { authReady, currentUser } = useApp();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#55645A]">
        Menghubungkan ke Efdi Kitchen...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/paket" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/paket" replace />} />

    {/* Customer & Public Screens */}
    <Route path="/paket" element={<CatalogPage />} />
    <Route path="/paket/:id" element={<PackageDetailPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    <Route
      path="/pesan"
      element={
        <RequireAuth>
          <OrderFormPage />
        </RequireAuth>
      }
    />
    <Route
      path="/cek-pesanan"
      element={
        <RequireAuth>
          <CheckOrderPage />
        </RequireAuth>
      }
    />
    <Route
      path="/pesanan/:kode/ringkasan"
      element={
        <RequireAuth>
          <OrderSummaryPage />
        </RequireAuth>
      }
    />
    <Route
      path="/pesanan/:kode/bayar"
      element={
        <RequireAuth>
          <PaymentUploadPage />
        </RequireAuth>
      }
    />
    <Route
      path="/pesanan/:kode"
      element={
        <RequireAuth>
          <OrderStatusPage />
        </RequireAuth>
      }
    />

    {/* Admin & Owner Screens */}
    <Route
      path="/admin"
      element={
        <RequireAuth allowedRoles={['Admin', 'Owner']}>
          <AdminDashboardPage />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/pesanan"
      element={
        <RequireAuth allowedRoles={['Admin', 'Owner']}>
          <AdminOrdersPage />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/pembayaran"
      element={
        <RequireAuth allowedRoles={['Admin', 'Owner']}>
          <AdminPaymentsPage />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/produk"
      element={
        <RequireAuth allowedRoles={['Admin', 'Owner']}>
          <AdminProductsPage />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/kebutuhan"
      element={
        <RequireAuth allowedRoles={['Admin', 'Owner']}>
          <AdminNeedsPage />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/stok"
      element={
        <RequireAuth allowedRoles={['Admin', 'Owner']}>
          <AdminStockPage />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/pengaturan"
      element={
        <RequireAuth allowedRoles={['Admin', 'Owner']}>
          <AdminSettingsPage />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/customer"
      element={
        <RequireAuth allowedRoles={['Admin', 'Owner']}>
          <AdminCustomersPage />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/laporan"
      element={
        <RequireAuth allowedRoles={['Owner']}>
          <AdminReportsPage />
        </RequireAuth>
      }
    />

    <Route path="*" element={<Navigate to="/paket" replace />} />
  </Routes>
);

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
