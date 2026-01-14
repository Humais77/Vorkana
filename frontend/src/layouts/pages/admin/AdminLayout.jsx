import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Sidebar from '../../../components/admin/AdminSideBar.jsx';

const AdminLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  
  // Simple admin session monitor
  useEffect(() => {
    // Only run on admin routes
    if (!location.pathname.startsWith('/admin')) return;
    
    let lastActivity = Date.now();
    
    // Track user activity
    const updateActivity = () => {
      lastActivity = Date.now();
    };
    
    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
    
    // Check every 5 minutes for admin timeout
    const checkInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      const oneHour = 60 * 60 * 1000; // 1 hour
      
      // If idle for 55 minutes, show warning (5 minutes before timeout)
      if (idleTime > 55 * 60 * 1000 && idleTime < oneHour) {
        const minutesLeft = Math.ceil((oneHour - idleTime) / (60 * 1000));
        toast.warning(`Admin session will expire in ${minutesLeft} minutes due to inactivity.`, {
          duration: 10000,
          id: 'admin-session-warning'
        });
      }
      
      // If idle for more than 1 hour, log out
      if (idleTime > oneHour) {
        clearInterval(checkInterval);
        
        // Remove listeners
        events.forEach(event => {
          document.removeEventListener(event, updateActivity);
        });
        
        // Show logout message
        toast.error('Admin session expired due to 1 hour of inactivity.', {
          duration: 5000
        });
        
        // Clear storage
        localStorage.removeItem('adminInfo');
        sessionStorage.removeItem('adminInfo');
        
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/signin?adminSessionExpired=true';
        }, 1000);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    // Cleanup
    return () => {
      clearInterval(checkInterval);
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [location.pathname]);
  
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