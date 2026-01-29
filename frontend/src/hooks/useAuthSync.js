// useAuthSync.js - Simplified and more resilient
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { authAPI } from '../api/auth';

export const useAuthSync = () => {
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const checkAndSyncAuth = async () => {
      if (!mounted) return;

      try {
        // First sync from storage (fastest)
        syncFromStorage();
        
        // Then check with server if we have cookies
        const hasCookies = document.cookie.includes('token=') || 
                          document.cookie.includes('refreshToken=');
        
        if (hasCookies) {
          const result = await authAPI.checkAuth();
          
          if (mounted) {
            if (result.success && result.isAuthenticated && result.user) {
              setAuth(result.user);
            } else if (result.success && !result.isAuthenticated && retryCount < maxRetries) {
              // Retry a few times for OAuth logins
              retryCount++;
              setTimeout(checkAndSyncAuth, 1000 * retryCount);
            }
          }
        }
      } catch (error) {
        console.warn('Auth sync error:', error);
        // Don't logout on sync errors
      }
    };

    // Initial sync
    checkAndSyncAuth();

    // Listen for OAuth success events
    const handleOAuthSuccess = () => {
      if (mounted) {
        // Immediate sync after OAuth
        setTimeout(() => {
          syncFromStorage();
          checkAndSyncAuth();
        }, 500);
      }
    };

    window.addEventListener('oauth-success', handleOAuthSuccess);

    // Listen for storage changes
    const handleStorageChange = (event) => {
      if (event.key === 'vorkanna_user_v1' && mounted) {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      mounted = false;
      window.removeEventListener('oauth-success', handleOAuthSuccess);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncFromStorage, setAuth, logout]);
};