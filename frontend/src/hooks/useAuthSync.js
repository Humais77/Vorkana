// useAuthSync.js - Updated for cookies
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';

export const useAuthSync = () => {
  const checkSessionValidity = useAuthStore((state) => state.checkSessionValidity);
  const updateLastActivity = useAuthStore((state) => state.updateLastActivity);
  const setUser = useAuthStore((state) => state.setUser);
  
  useEffect(() => {
    // Check session validity on mount
    checkSessionValidity();
    
    // Sync user info from localStorage on mount
    const syncUserFromStorage = () => {
      try {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const user = JSON.parse(userInfo);
          setUser(user);
        }
      } catch (error) {
        console.error('Error syncing user from storage:', error);
      }
    };
    
    syncUserFromStorage();
    
    // Periodically check session with server
    const checkAuthStatus = async () => {
      try {
        const response = await authAPI.getSessionStatus();
        if (response.success && response.authenticated && response.user) {
          setUser(response.user);
        } else if (response.authenticated === false) {
          useAuthStore.getState().logout();
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };
    
    // Initial check
    checkAuthStatus();
    
    // Check every 5 minutes
    const intervalId = setInterval(checkAuthStatus, 5 * 60 * 1000);
    
    // Activity listeners
    const handleUserActivity = () => {
      updateLastActivity();
    };
    
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });
    
    // Storage change listener for user info
    const handleStorageChange = (event) => {
      if (event.key === 'userInfo') {
        syncUserFromStorage();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(intervalId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkSessionValidity, updateLastActivity, setUser]);
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
  
  return { isAuthenticated, user, loading, isAdmin: user?.role === 'admin' };
};