// Simplified useAuthSync.js
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useCheckAuth } from './useAuth';

export const useAuthSync = () => {
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  const { refetch: checkAuth } = useCheckAuth();

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
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncFromStorage, checkAuth]);
};

// Remove all session timeout/validation logic