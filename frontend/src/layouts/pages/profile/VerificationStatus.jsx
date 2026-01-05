// src/components/auth/VerificationStatus.jsx
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const VerificationStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = searchParams.get('token');
    const status = searchParams.get('status');
    
    if (token && (status === 'success' || status === 'already')) {
      // Store token and navigate to verification page
      localStorage.setItem('verificationToken', token);
      navigate(`/verify-email?token=${token}&status=${status}`);
    } else {
      navigate('/verify-email?error=verification_failed');
    }
  }, [searchParams, navigate]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600">
          Redirecting to verification page...
        </p>
      </div>
    </div>
  );
};

export default VerificationStatus;