// AdminRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load pages
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const UsersManagement = lazy(() => import('../../../components/admin/UsersManagement'));
const CategoriesManagement = lazy(() => import('../../../components/admin/CategoriesManagement'));
const SubcategoriesManagement = lazy(() => import('../../../components/admin/SubcategoriesManagement'));
const ServicesManagement = lazy(() => import('../../../components/admin/ServicesManagement'));
const GigsManagement = lazy(() => import('../../../components/admin/GigsManagement'));
const SecurityPage = lazy(() => import('../../../components/admin/SecurityPage'));
const ActivityLogPage = lazy(() => import('../../../components/admin/ActivityLogPage'));
const SettingsPage = lazy(() => import('../../../components/admin/SettingsPage'));

// Add new admin service pages
const AdminEditService = lazy(() => import('../../../components/admin/AdminEditService'));
const AdminViewService = lazy(() => import('../../../components/admin/AdminViewService'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

const AdminRoutes = () => {
  return (
    <Routes>
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
      <Route path="subcategories" element={
        <Suspense fallback={<LoadingSpinner />}>
          <SubcategoriesManagement />
        </Suspense>
      } />
      <Route path="services" element={
        <Suspense fallback={<LoadingSpinner />}>
          <ServicesManagement />
        </Suspense>
      } />
      {/* Add new service routes */}
      <Route path="services/:id" element={
        <Suspense fallback={<LoadingSpinner />}>
          <AdminViewService />
        </Suspense>
      } />
      <Route path="services/:id/edit" element={
        <Suspense fallback={<LoadingSpinner />}>
          <AdminEditService />
        </Suspense>
      } />
      <Route path="gigs" element={
        <Suspense fallback={<LoadingSpinner />}>
          <GigsManagement />
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
      <Route path="analytics" element={<div>Analytics</div>} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminRoutes;