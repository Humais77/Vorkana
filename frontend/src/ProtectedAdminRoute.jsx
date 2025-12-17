// ProtectedAdminRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';

const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuthStore();
  const location = useLocation();

  // ⛔ While auth state is resolving, render NOTHING
  if (loading) {
    return null;
  }

  // 🚫 Not logged in
  if (!isAuthenticated) {
    sessionStorage.setItem('adminRedirectUrl', location.pathname);
    return <Navigate to="/" replace />;
  }

  // 🚫 Logged in but not admin
  const isAdmin =
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.isAdmin === true;

  if (!isAdmin) {
    sessionStorage.setItem('adminRedirectUrl', location.pathname);
    return <Navigate to="/" replace />;
  }

  // ✅ Authorized admin
  return children;
};

export default ProtectedAdminRoute;