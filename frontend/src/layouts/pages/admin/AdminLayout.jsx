import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiBell, FiSearch, FiLogOut, FiClock, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Sidebar from '../../../components/admin/Sidebar';
import { adminAPI } from './api/admin'; // Adjust path as needed

const AdminLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState(null);
  const [warning, setWarning] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const navigate = useNavigate();

  // Initialize session management on mount
  useEffect(() => {
    // Get admin info from localStorage
    const adminData = adminAPI.getCurrentUser();
    setAdminInfo(adminData);

    // Start session timer
    startSessionMonitoring();

    // Check session periodically
    const sessionInterval = setInterval(() => {
      checkSessionStatus();
    }, 60000); // Check every minute

    return () => {
      clearInterval(sessionInterval);
    };
  }, []);

  const startSessionMonitoring = () => {
    const timeLeft = adminAPI.getSessionTimeLeft();
    if (timeLeft > 0) {
      const minutesLeft = Math.ceil(timeLeft / 1000 / 60);
      setSessionTime(minutesLeft);

      // Show warning when 5 minutes or less
      if (minutesLeft <= 5) {
        setWarning(true);
        
        // Show modal warning at 2 minutes
        if (minutesLeft <= 2) {
          setShowWarningModal(true);
        }
      }
    }
  };

  const checkSessionStatus = async () => {
    try {
      const timeLeft = adminAPI.getSessionTimeLeft();
      if (timeLeft <= 0) {
        // Session expired
        handleAutoLogout();
        return;
      }

      const minutesLeft = Math.ceil(timeLeft / 1000 / 60);
      setSessionTime(minutesLeft);

      // Update warning state
      if (minutesLeft <= 5) {
        setWarning(true);
        
        // Show toast warning at 5, 3, and 1 minute marks
        if (minutesLeft === 5 || minutesLeft === 3 || minutesLeft === 1) {
          toast.warning(`Session expires in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`, {
            icon: '⏰',
            duration: 5000
          });
        }

        // Show modal at 2 minutes
        if (minutesLeft === 2 && !showWarningModal) {
          setShowWarningModal(true);
        }
      } else {
        setWarning(false);
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  const handleAutoLogout = async () => {
    toast.error('Session expired. Please login again.', {
      icon: '🔒',
      duration: 3000
    });
    
    try {
      await adminAPI.adminLogout();
    } catch (error) {
      console.error('Auto logout error:', error);
    }
    
    // Clear local storage
    adminAPI.clearSession();
    
    // Navigate to login
    navigate('/admin/login', { replace: true });
  };

  const handleLogout = async () => {
    try {
      await adminAPI.adminLogout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
    
    // Clear local storage
    adminAPI.clearSession();
    
    // Navigate to login
    navigate('/admin/login', { replace: true });
  };

  const handleExtendSession = async () => {
    setShowWarningModal(false);
    
    // In a real implementation, you might have an endpoint to extend session
    toast.success('Session extended', { icon: '✅' });
    
    // Reset warning
    setWarning(false);
    
    // Simulate session extension (in real app, this would come from server)
    adminAPI.resetSession();
    startSessionMonitoring();
  };

  // Add activity listeners to reset warning
  useEffect(() => {
    const handleUserActivity = () => {
      if (warning) {
        // Reset warning if user is active
        setWarning(false);
      }
    };

    const events = ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [warning]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Session Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mx-auto mb-4">
                <FiAlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Session About to Expire
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Your admin session will expire in {sessionTime} minute{sessionTime !== 1 ? 's' : ''}.
                Do you want to extend your session?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Logout Now
                </button>
                <button
                  onClick={handleExtendSession}
                  className="flex-1 px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Extend Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiMenu className="h-6 w-6" />
            </button>
            
            <div className="relative hidden lg:block">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-64 lg:w-80 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Session Timer Display */}
            {sessionTime !== null && (
              <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                warning ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
              }`}>
                <FiClock className={`h-4 w-4 mr-2 ${warning ? 'text-yellow-600' : 'text-blue-600'}`} />
                <span>{sessionTime}m</span>
                {warning && (
                  <span className="ml-1 animate-pulse">⚠️</span>
                )}
              </div>
            )}

            <button className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">
              <FiBell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="relative group">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {adminInfo?.name || 'Administrator'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {adminInfo?.role || 'Super Admin'}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {adminInfo?.name?.charAt(0) || 'A'}
                </div>
              </div>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{adminInfo?.name || 'Admin'}</p>
                    <p className="text-xs text-gray-500">{adminInfo?.email || 'admin@example.com'}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <FiLogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar */}
        <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        
        {/* Main Content */}
        <main className="flex-1 min-h-screen overflow-y-auto bg-gray-50">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {/* Session Expiry Alert */}
            {warning && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center">
                  <FiAlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      Session expires in {sessionTime} minute{sessionTime !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Please save your work. Session will auto-logout on expiry.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowWarningModal(true)}
                    className="text-sm text-yellow-700 hover:text-yellow-900 font-medium"
                  >
                    Extend
                  </button>
                </div>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;