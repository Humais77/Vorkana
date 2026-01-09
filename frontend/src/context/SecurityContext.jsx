// SecurityContext.jsx - Add cookie check
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';

const SecurityContext = createContext({});

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [securityStatus, setSecurityStatus] = useState({
    isSecure: false,
    checks: [],
    lastChecked: null
  });

  const runSecurityChecks = async () => {
    const checks = [];
    const now = new Date();

    // 1. Check if user is authenticated (via cookies)
    checks.push({
      id: 'auth',
      name: 'Authentication',
      status: isAuthenticated,
      message: isAuthenticated ? 'User authenticated' : 'Not authenticated',
      severity: 'high'
    });

    // 2. Check if using HTTPS
    const isHttps = window.location.protocol === 'https:';
    checks.push({
      id: 'https',
      name: 'HTTPS Connection',
      status: isHttps || window.location.hostname === 'localhost',
      message: isHttps ? 'Secure connection' : 'Not using HTTPS',
      severity: 'high'
    });

    // 3. Check if cookies are enabled
    const cookiesEnabled = navigator.cookieEnabled;
    checks.push({
      id: 'cookies',
      name: 'Cookies Enabled',
      status: cookiesEnabled,
      message: cookiesEnabled ? 'Cookies enabled' : 'Cookies disabled',
      severity: 'high'
    });

    // 4. Check for security headers
    const hasSecurityHeaders = await checkSecurityHeaders();
    checks.push({
      id: 'headers',
      name: 'Security Headers',
      status: hasSecurityHeaders,
      message: hasSecurityHeaders ? 'Headers present' : 'Missing security headers',
      severity: 'medium'
    });

    // 5. Check if email is verified
    checks.push({
      id: 'email',
      name: 'Email Verification',
      status: user?.emailVerified || false,
      message: user?.emailVerified ? 'Email verified' : 'Email not verified',
      severity: 'medium'
    });

    const allPassed = checks.every(check => check.status);
    
    setSecurityStatus({
      isSecure: allPassed,
      checks,
      lastChecked: now
    });

    // Show warnings for failed checks
    if (!allPassed) {
      const failedChecks = checks.filter(check => !check.status);
      if (failedChecks.some(check => check.severity === 'high')) {
        toast.error('Security issues detected. Some features may be unavailable.');
      }
    }

    return allPassed;
  };

  const checkSecurityHeaders = async () => {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        credentials: 'include' // Include cookies
      });
      const headers = response.headers;
      
      return headers.has('x-content-type-options') && 
             headers.has('x-frame-options') &&
             headers.has('x-xss-protection');
    } catch (error) {
      return false;
    }
  };

  // Run checks on mount and when auth changes
  useEffect(() => {
    runSecurityChecks();
    
    const interval = setInterval(runSecurityChecks, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const value = {
    securityStatus,
    runSecurityChecks,
    isSecure: securityStatus.isSecure
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};