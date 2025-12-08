import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const useAuthSync = () => {
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);
  
  useEffect(() => {
    syncFromStorage();
    
    const handleStorageChange = () => {
      syncFromStorage();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncFromStorage]);
};