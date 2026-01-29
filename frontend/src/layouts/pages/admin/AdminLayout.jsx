import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { showWarningToast, showErrorToast } from '../../../components/Toaster';
import Sidebar from '../../../components/admin/AdminSideBar.jsx';

const AdminLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const [sessionWarningShown, setSessionWarningShown] = useState(false);
  const [countdownInterval, setCountdownInterval] = useState(null);
  
  // Simple admin session monitor
  useEffect(() => {
    // Only run on admin routes
    if (!location.pathname.startsWith('/admin')) return;
    
    let lastActivity = Date.now();
    let warningToastId = null;
    let countdownToastId = null;
    
    // Track user activity
    const updateActivity = () => {
      lastActivity = Date.now();
      
      // Reset warning flag when user is active
      if (Date.now() - lastActivity < 55 * 60 * 1000) {
        setSessionWarningShown(false);
        
        // Clear any existing countdown toast
        if (countdownToastId) {
          toast.dismiss(countdownToastId);
          countdownToastId = null;
        }
      }
    };
    
    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
    
    // Countdown update function
    const updateCountdown = () => {
      const idleTime = Date.now() - lastActivity;
      const oneHour = 60 * 60 * 1000;
      const timeLeft = oneHour - idleTime;
      
      if (timeLeft <= 5 * 60 * 1000 && timeLeft > 0) {
        const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
        const secondsLeft = Math.floor((timeLeft % (60 * 1000)) / 1000);
        
        // Update or create countdown toast
        if (!countdownToastId) {
          countdownToastId = toast(
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500 animate-pulse" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Session expiring soon</p>
                <p className="text-sm text-gray-600 mt-1">
                  Your admin session will expire in {minutesLeft}:{secondsLeft.toString().padStart(2, '0')} due to inactivity
                </p>
              </div>
            </div>,
            {
              toastId: 'session-countdown',
              position: 'bottom-right',
              autoClose: false,
              closeButton: false,
              hideProgressBar: false,
              theme: 'colored',
              className: '!bg-orange-50 !border !border-orange-200',
              progressClassName: '!bg-gradient-to-r !from-orange-400 !to-orange-600',
              draggable: false,
              closeOnClick: false
            }
          );
        }
      }
    };
    
    // Check every 5 minutes for admin timeout
    const checkInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      const oneHour = 60 * 60 * 1000;
      
      // If idle for 55 minutes, show warning (5 minutes before timeout)
      if (idleTime > 55 * 60 * 1000 && idleTime < oneHour) {
        if (!sessionWarningShown) {
          const minutesLeft = Math.ceil((oneHour - idleTime) / (60 * 1000));
          
          // Show initial warning toast
          showWarningToast(
            'Admin Session Expiring',
            `Your admin session will expire in ${minutesLeft} minutes due to inactivity. Please interact with the page to extend your session.`,
            {
              toastId: 'session-warning',
              autoClose: 10000,
              position: 'bottom-right'
            }
          );
          
          setSessionWarningShown(true);
          
          // Start countdown updates every second for last 5 minutes
          const countdown = setInterval(updateCountdown, 1000);
          setCountdownInterval(countdown);
        }
      }
      
      // If idle for more than 1 hour, log out
      if (idleTime > oneHour) {
        clearInterval(checkInterval);
        
        // Clear countdown interval if exists
        if (countdownInterval) {
          clearInterval(countdownInterval);
          setCountdownInterval(null);
        }
        
        // Clear countdown toast
        if (countdownToastId) {
          toast.dismiss(countdownToastId);
        }
        
        // Remove listeners
        events.forEach(event => {
          document.removeEventListener(event, updateActivity);
        });
        
        // Show logout message
        showErrorToast(
          'Session Expired',
          'Your admin session has expired due to 1 hour of inactivity. Please login again.',
          {
            toastId: 'session-expired',
            autoClose: 5000,
            position: 'bottom-right'
          }
        );
        
        // Clear storage
        const authKeys = [
          'vorkanna_auth_state_v1',
          'vorkanna_user_v1',
          'csrfToken',
          'csrfTokenExpiry',
          'admin-store'
        ];
        
        authKeys.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
        
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/signin?adminSessionExpired=true';
        }, 3000);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    // Cleanup
    return () => {
      clearInterval(checkInterval);
      
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      
      // Clear toasts
      if (warningToastId) {
        toast.dismiss(warningToastId);
      }
      
      if (countdownToastId) {
        toast.dismiss(countdownToastId);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [location.pathname, sessionWarningShown, countdownInterval]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile hamburger button - positioned absolutely */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 text-gray-600 hover:text-gray-900 p-3 rounded-lg hover:bg-gray-100 bg-white shadow-md"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <div className="flex">
        {/* Sidebar */}
        <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        
        {/* Main Content with padding for mobile hamburger */}
        <main className="flex-1 min-h-screen overflow-y-auto bg-gray-50 pt-16 lg:pt-0">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;