import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const AuthProtectedRoute = ({ 
  children, 
  requireProfileCompletion = false, 
  redirectTo = '/signin' 
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        sessionStorage.setItem('redirectAfterLogin', location.pathname);
        navigate(redirectTo, { state: { from: location.pathname } });
      }
    }
  }, [isAuthenticated, isLoading, navigate, location, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
};

export default AuthProtectedRoute;