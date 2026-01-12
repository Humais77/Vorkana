// hooks/useAutoLogout.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';

const useAutoLogout = (timeoutMinutes = 15) => {
  const navigate = useNavigate();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  
  useEffect(() => {
    let logoutTimer;
    let activityListeners = [];

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      
      logoutTimer = setTimeout(() => {
        // Show warning
        const confirmLogout = window.confirm(
          `You've been inactive for ${timeoutMinutes} minutes. Would you like to stay logged in?`
        );
        
        if (!confirmLogout) {
          handleLogout();
        } else {
          resetTimer(); // Reset timer if user wants to stay
        }
      }, timeoutMs);
    };

    const handleLogout = async () => {
      try {
        await authAPI.logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        localStorage.removeItem('userInfo');
        navigate('/signin?reason=inactivity');
      }
    };

    const handleActivity = () => {
      resetTimer();
    };

    // Add activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
      activityListeners.push({ event, handler: handleActivity });
    });

    // Initial timer setup
    resetTimer();

    // Cleanup
    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      activityListeners.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [navigate, timeoutMs, timeoutMinutes]);
};

export default useAutoLogout;