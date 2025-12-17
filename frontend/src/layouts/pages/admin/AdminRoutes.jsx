// AdminRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layout
import AdminLayout from './AdminLayout';

// Lazy load pages
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const UsersManagement = lazy(() => import('../../../components/admin/UsersManagement'));
const CategoriesManagement = lazy(() => import('../../../components/admin/CategoriesManagement'));
const SecurityPage = lazy(() => import('../../../components/admin/SecurityPage'));
const ActivityLogPage = lazy(() => import('../../../components/admin/ActivityLogPage'));
const SettingsPage = lazy(() => import('../../../components/admin/SettingsPage'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

const AdminRoutes = () => {
  return (
    <Routes>
      {/* All admin routes should be under /admin/* */}
      <Route path="/" element={<AdminLayout />}>
        <Route index element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminDashboard />
          </Suspense>
        } />
        <Route path="users" element={
          <Suspense fallback={<LoadingSpinner />}>
            <UsersManagement />
          </Suspense>
        } />
        <Route path="categories" element={
          <Suspense fallback={<LoadingSpinner />}>
            <CategoriesManagement />
          </Suspense>
        } />
        <Route path="security" element={
          <Suspense fallback={<LoadingSpinner />}>
            <SecurityPage />
          </Suspense>
        } />
        <Route path="activity" element={
          <Suspense fallback={<LoadingSpinner />}>
            <ActivityLogPage />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<LoadingSpinner />}>
            <SettingsPage />
          </Suspense>
        } />
        {/* Add other admin routes */}
        <Route path="services" element={<div>Services Management</div>} />
        <Route path="gigs" element={<div>Gigs Management</div>} />
        <Route path="analytics" element={<div>Analytics</div>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;