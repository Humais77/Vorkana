// useAuthSync.js - Updated for cookie-based auth
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useCheckAuth } from './useAuth';

export const useAuthSync = () => {
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  const checkSessionValidity = useAuthStore((state) => state.checkSessionValidity);
  const updateLastActivity = useAuthStore((state) => state.updateLastActivity);
  const { refetch: checkAuth } = useCheckAuth();
  
  useEffect(() => {
    // Initial sync
    syncFromStorage();
    
    // Check auth with server (cookies)
    checkAuth();
    
    const handleStorageChange = (event) => {
      if (event.key === 'userInfo') {
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
      // Refresh auth check every 5 minutes
      checkAuth();
    }, 5 * 60 * 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(intervalId);
    };
  }, [syncFromStorage, checkSessionValidity, updateLastActivity, checkAuth]);
};

export const useProtectedRoute = (redirectPath = '/signin') => {
  const { isAuthenticated, user, loading } = useAuthStore();
  const navigate = useNavigate();
  const { data: authCheck } = useCheckAuth();
  
  useEffect(() => {
    if (!loading && authCheck?.isAuthenticated === false) {
      navigate(redirectPath);
    }
  }, [loading, authCheck, navigate, redirectPath]);
  
  return { isAuthenticated, user, loading };
};

export const useAdminRoute = () => {
  const { isAuthenticated, user, loading } = useAuthStore();
  const navigate = useNavigate();
  const { data: authCheck } = useCheckAuth();
  
  useEffect(() => {
    if (!loading) {
      if (authCheck?.isAuthenticated === false) {
        navigate('/signin');
      } else if (user?.role !== 'admin') {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, loading, navigate, authCheck]);
  
  return { isAuthenticated, user: user, loading, isAdmin: user?.role === 'admin' };
};

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