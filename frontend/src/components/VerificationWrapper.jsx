// VerificationWrapper.jsx - UPDATED VERSION
import React, { useEffect, useState, useRef } from 'react';

const VerificationWrapper = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    // Only set mounted if not already mounted
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      setIsMounted(true);
    }

    return () => {
      // Don't reset on cleanup to prevent re-mounting
      // This component should only mount once
    };
  }, []);

  // Show nothing until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading verification...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default VerificationWrapper;