// components/SessionMonitor.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';

const SessionMonitor = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let checkInterval;
    
    const checkSession = async () => {
      try {
        const response = await authAPI.checkSessionStatus();
        
        if (!response.authenticated) {
          // Session is invalid, redirect to login
          localStorage.removeItem('userInfo');
          navigate('/signin?session=expired');
        }
      } catch (error) {
        // Silent error
      }
    };

    // Check every 5 minutes
    checkInterval = setInterval(checkSession, 5 * 60 * 1000);
    
    // Initial check
    checkSession();
    
    // Listen for storage events (other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'userInfo' && !e.newValue) {
        // User logged out in another tab
        navigate('/signin');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  return null;
};

export default SessionMonitor;