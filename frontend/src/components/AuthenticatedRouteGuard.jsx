// components/AuthenticatedRouteGuard.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const AuthenticatedRouteGuard = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();
  
  // Show nothing while checking auth status
  if (loading) {
    return null;
  }
  
  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // If not authenticated, allow access to auth pages
  return children;
};

export default AuthenticatedRouteGuard;