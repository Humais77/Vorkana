// src/components/auth/EmailVerificationHandler.jsx
import React, { useEffect } from 'react';

const EmailVerificationHandler = () => {
  useEffect(() => {
    // Handle verification status from popup window
    const handleMessage = (event) => {
      // Verify origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data && event.data.type === 'email-verification') {
        const { token, status } = event.data;
        
        if (status === 'success' || status === 'already') {
          // Store token and redirect
          localStorage.setItem('verificationToken', token);
          window.opener.postMessage({
            type: 'email-verification-complete',
            success: true,
            status
          }, window.location.origin);
        } else {
          window.opener.postMessage({
            type: 'email-verification-complete',
            success: false,
            error: 'Verification failed'
          }, window.location.origin);
        }
        
        // Close the popup
        window.close();
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600">
          Processing verification...
        </p>
        <p className="text-gray-500 text-sm mt-2">
          This window will close automatically
        </p>
      </div>
    </div>
  );
};

export default EmailVerificationHandler;