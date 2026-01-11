// hooks/useAuthSync.js
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useCheckAuth, useCheckSessionStatus, useRefreshSession } from './useAuth';

export const useAuthSync = () => {
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  const checkSessionValidity = useAuthStore((state) => state.checkSessionValidity);
  const updateLastActivity = useAuthStore((state) => state.updateLastActivity);
  const { refetch: checkAuth } = useCheckAuth();
  const { data: sessionStatus } = useCheckSessionStatus();
  const refreshSession = useRefreshSession();

  useEffect(() => {
    // Initial sync
    syncFromStorage();

    // Check auth with server
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

    // Refresh session if about to expire
    let refreshInterval;
    if (sessionStatus?.authenticated && sessionStatus.session?.timeRemaining < 300000) {
      // 5 minutes remaining
      refreshInterval = setInterval(() => {
        refreshSession.mutate();
      }, 240000); // Refresh every 4 minutes
    }

    // Check session validity periodically
    const checkInterval = setInterval(() => {
      checkSessionValidity();
      // Refresh auth check every 5 minutes
      checkAuth();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(refreshInterval);
      clearInterval(checkInterval);
    };
  }, [
    syncFromStorage,
    checkSessionValidity,
    updateLastActivity,
    checkAuth,
    sessionStatus,
    refreshSession,
  ]);
};

export const useProtectedRoute = (redirectPath = '/signin') => {
  const { isAuthenticated, user, loading } = useAuthStore();
  const navigate = useNavigate();
  const { data: authCheck } = useCheckAuth();

  useEffect(() => {
    if (!loading && authCheck?.isAuthenticated === false) {
      navigate(redirectPath, { state: { from: window.location.pathname } });
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
        navigate('/signin', { state: { from: window.location.pathname } });
      } else if (user?.role !== 'admin') {
        navigate('/', { replace: true });
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

export const useAuthStatus = () => {
  const { data: authCheck } = useCheckAuth();
  const { isAuthenticated, user, loading } = useAuthStore();

  return {
    isAuthenticated: authCheck?.isAuthenticated || isAuthenticated,
    user: user,
    loading: loading || authCheck?.isFetching,
    isAdmin: user?.role === 'admin',
    isEmailVerified: user?.emailVerified,
    session: authCheck?.session,
  };
};