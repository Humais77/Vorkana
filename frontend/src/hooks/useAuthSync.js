import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export const useAuthSync = () => {
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  const checkSessionValidity = useAuthStore((state) => state.checkSessionValidity);
  const updateLastActivity = useAuthStore((state) => state.updateLastActivity);
  
  useEffect(() => {
    // Initial sync
    syncFromStorage();
    
    // Check session validity
    checkSessionValidity();
    
    const handleStorageChange = (event) => {
      if (event.key?.startsWith('auth-') || event.key === 'userToken' || event.key === 'userInfo') {
        syncFromStorage();
      }
    };
    
    const handleUserActivity = () => {
      updateLastActivity();
    };
    
    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for user activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });
    
    // Check session validity periodically
    const intervalId = setInterval(() => {
      checkSessionValidity();
    }, 60000); // Check every minute
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(intervalId);
    };
  }, [syncFromStorage, checkSessionValidity, updateLastActivity]);
};

// Custom hook for protected routes
export const useProtectedRoute = (redirectPath = '/signin') => {
  const { isAuthenticated, user, loading } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(redirectPath);
    }
  }, [isAuthenticated, loading, navigate, redirectPath]);
  
  return { isAuthenticated, user, loading };
};

// Custom hook for admin routes
export const useAdminRoute = () => {
  const { isAuthenticated, user, loading } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/signin');
      } else if (user?.role !== 'admin') {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, loading, navigate]);
  
  return { isAuthenticated, user: user, loading, isAdmin: user?.role === 'admin' };
};

// Custom hook for email verification check
export const useEmailVerificationCheck = (redirectPath = '/verify-email') => {
  const { isAuthenticated, user, loading } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && isAuthenticated && user && !user.emailVerified) {
      navigate(redirectPath);
    }
  }, [isAuthenticated, user, loading, navigate, redirectPath]);
  
  return { isEmailVerified: user?.emailVerified, loading };
};