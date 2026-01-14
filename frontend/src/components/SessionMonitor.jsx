// components/SessionMonitor.jsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { authAPI } from '../api/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const SessionMonitor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuthStore();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [checking, setChecking] = useState(false);

  // Reset activity on user interaction
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const resetActivity = () => {
      setLastActivity(Date.now());
    };

    events.forEach(event => {
      window.addEventListener(event, resetActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetActivity);
      });
    };
  }, []);

  // Check session status periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = async () => {
      if (checking) return;
      
      setChecking(true);
      try {
        const response = await authAPI.checkSessionStatus();
        
        if (!response.authenticated) {
          // Session expired
          toast.error('Session expired. Please login again.');
          logout();
          navigate('/signin', { 
            state: { 
              from: location.pathname,
              reason: 'session_expired'
            }
          });
        }
      } catch (error) {
        console.error('Session check failed:', error);
        // Don't logout on network errors
      } finally {
        setChecking(false);
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    // Also check after 30 minutes of inactivity
    const inactivityCheck = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > 30 * 60 * 1000) { // 30 minutes
        checkSession();
      }
    }, 60 * 1000); // Check every minute

    return () => {
      clearInterval(interval);
      clearInterval(inactivityCheck);
    };
  }, [isAuthenticated, lastActivity, logout, navigate, location, checking]);

  // Check on route changes
  useEffect(() => {
    if (isAuthenticated && !location.pathname.includes('/signin')) {
      // Quick session check on route change
      authAPI.checkSessionStatus().then(response => {
        if (!response.authenticated) {
          logout();
          navigate('/signin', { 
            state: { 
              from: location.pathname,
              reason: 'session_expired'
            }
          });
        }
      }).catch(() => {
        // Ignore network errors during navigation
      });
    }
  }, [location.pathname, isAuthenticated, logout, navigate]);

  return null; // This component doesn't render anything
};

export default SessionMonitor;