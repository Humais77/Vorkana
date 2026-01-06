// components/SessionChecker.jsx
import { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { authAPI } from '../../api/auth';
import { toast } from 'react-hot-toast';

export default function SessionChecker() {
  const { logout, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Check session every 5 minutes
    const intervalId = setInterval(async () => {
      try {
        await authAPI.checkAuth();
      } catch (error) {
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          logout();
        }
      }
    }, 5 * 60 * 1000);
    
    // Listen for visibility change (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        authAPI.checkAuth().catch(() => {
          // Silent fail
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, logout]);
  
  return null; // This is a background component
}