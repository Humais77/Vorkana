// components/SessionMonitor.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { authAPI } from '../api/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const SessionMonitor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user, clearAuth } = useAuthStore();
  
  // Use refs for values that change but shouldn't trigger re-renders
  const lastActivityRef = useRef(Date.now());
  const sessionCheckRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  
  // State for UI if needed
  const [isChecking, setIsChecking] = useState(false);

  // Constants for timeouts (in milliseconds)
  const SESSION_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours
  const CHECK_INTERVAL = 1 * 60 * 1000; // Check every 1 minute
  const WARNING_THRESHOLD = 2.5 * 60 * 60 * 1000; // Warn at 2.5 hours
  const INACTIVITY_CHECK = 5 * 60 * 1000; // Check inactivity every 5 minutes

  // Reset activity timestamp on user interaction
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    console.log('[SESSION] Activity updated');
  }, []);

  // Check session status with backend
  const checkSessionStatus = useCallback(async () => {
    if (!isAuthenticated || isChecking) return;
    
    setIsChecking(true);
    try {
      console.log('[SESSION] Checking session status...');
      const response = await authAPI.checkSessionStatus();
      
      if (response.authenticated) {
        // Calculate time left before timeout
        const idleTime = Date.now() - lastActivityRef.current;
        const timeLeft = SESSION_TIMEOUT - idleTime;
        
        // Show warning when approaching timeout (30 minutes left)
        if (timeLeft > 0 && timeLeft < 30 * 60 * 1000) {
          const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
          toast(`Your session will expire in ${minutesLeft} minutes`, {
            icon: '⏰',
            duration: 5000,
            style: {
              background: '#fffbeb',
              color: '#92400e',
              border: '1px solid #fbbf24',
            }
          });
        }
        
        // Check if session should be timed out based on last activity
        if (idleTime > SESSION_TIMEOUT) {
          console.log(`[SESSION TIMEOUT] Idle for ${Math.round(idleTime/1000/60)} minutes`);
          handleSessionTimeout();
        }
      } else {
        // Session is invalid or expired
        console.log('[SESSION] Session is no longer valid');
        handleSessionTimeout();
      }
    } catch (error) {
      console.error('[SESSION] Error checking session:', error);
      // On network errors, check local activity timeout
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime > SESSION_TIMEOUT) {
        handleSessionTimeout();
      }
    } finally {
      setIsChecking(false);
    }
  }, [isAuthenticated, isChecking]);

  // Handle session timeout
  const handleSessionTimeout = useCallback(() => {
    console.log('[SESSION] Handling session timeout');
    
    // Clear any existing intervals/timers
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    // Clear auth state
    clearAuth();
    
    // Show timeout notification
    toast.error('Session timed out after 3 hours of inactivity. Please login again.', {
      duration: 5000,
      position: 'top-center',
      icon: '⏰',
      style: {
        background: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
      },
    });
    
    // Redirect to signin page
    const currentPath = location.pathname;
    const isAuthPage = currentPath.includes('/signin') || 
                      currentPath.includes('/signup') || 
                      currentPath.includes('/verify');
    
    if (!isAuthPage) {
      navigate('/signin', { 
        state: { 
          from: currentPath,
          reason: 'session_timeout',
          timeout: true
        },
        replace: true
      });
    }
  }, [clearAuth, navigate, location]);

  // Initialize session monitoring
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear intervals if not authenticated
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    console.log('[SESSION] Starting session monitoring...');
    lastActivityRef.current = Date.now();

    // Set up activity listeners
    const events = ['mousedown', 'keydown', 'keypress', 'scroll', 'touchstart', 'click', 'input'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Start periodic session checks
    sessionCheckRef.current = setInterval(() => {
      checkSessionStatus();
    }, CHECK_INTERVAL);

    // Immediate check on mount
    checkSessionStatus();

    // Check inactivity periodically
    inactivityTimerRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      console.log(`[SESSION] Idle for ${Math.round(idleTime/1000/60)} minutes`);
      
      if (idleTime > SESSION_TIMEOUT) {
        handleSessionTimeout();
      }
    }, INACTIVITY_CHECK);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [isAuthenticated, checkSessionStatus, handleSessionTimeout, updateActivity]);

  // Quick check on route changes (except auth pages)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const currentPath = location.pathname;
    const isAuthPage = currentPath.includes('/signin') || 
                      currentPath.includes('/signup') || 
                      currentPath.includes('/verify');
    
    if (!isAuthPage) {
      // Update activity on route change
      updateActivity();
      
      // Quick session check (non-blocking)
      setTimeout(() => {
        checkSessionStatus();
      }, 1000);
    }
  }, [location.pathname, isAuthenticated, checkSessionStatus, updateActivity]);

  // Add a manual refresh button in development
  if (process.env.NODE_ENV === 'development' && isAuthenticated) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        background: '#1f2937',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        cursor: 'pointer',
        opacity: 0.7
      }}
      onClick={checkSessionStatus}
      title="Check session status">
        Session Monitor Active
      </div>
    );
  }

  return null;
};

export default SessionMonitor;