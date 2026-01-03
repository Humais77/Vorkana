// AdminRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load pages
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const UsersManagement = lazy(() => import('../../../components/admin/usersManagment/UsersManagement'));
const CategoriesManagement = lazy(() => import('../../../components/admin/categoriesManagement/CategoriesManagement'));
const SubcategoriesManagement = lazy(() => import('../../../components/admin/subcategoriesManagement/SubcategoriesManagement'));
const ServicesManagement = lazy(() => import('../../../components/admin/servicesManagement/ServicesManagement'));
const GigsManagement = lazy(() => import('../../../components/admin/gigsManagement/GigsManagement'));

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
      <Route path="gigs" element={
        <Suspense fallback={<LoadingSpinner />}>
          <GigsManagement />
        </Suspense>
      } />
      <Route path="analytics" element={<div>Analytics</div>} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminRoutes;