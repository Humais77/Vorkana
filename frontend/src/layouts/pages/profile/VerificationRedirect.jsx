// src/components/auth/VerificationRedirect.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../../../api/auth';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ShieldCheck,
  MailCheck
} from 'lucide-react';

const VerificationRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    const token = searchParams.get('token');
    const statusParam = searchParams.get('status');
    
    const handleVerification = async () => {
      try {
        setStatus('processing');
        
        if (statusParam === 'success' || statusParam === 'already') {
          // Success or already verified from backend redirect
          const token = searchParams.get('token') || localStorage.getItem('verificationToken');
          
          if (token) {
            // Call verify API to complete the process
            const result = await authAPI.verifyEmail(token);
            
            if (result.success) {
              setStatus('success');
              setMessage(result.message || 'Email verified successfully!');
              
              // Store tokens if provided
              if (result.token && result.refreshToken) {
                setAuth(result.user, result.token, result.refreshToken);
              }
              
              // Start countdown
              const interval = setInterval(() => {
                setCountdown(prev => {
                  if (prev <= 1) {
                    clearInterval(interval);
                    navigate('/dashboard');
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
              
              return;
            }
          }
        }
        
        // Default error
        setStatus('error');
        setMessage('Verification failed. Please try again.');
        
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed');
      }
    };
    
    handleVerification();
  }, [searchParams, navigate, setAuth]);
  
  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Processing Verification
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email...
            </p>
          </div>
        );
        
      case 'success':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Email Verified!
            </h2>
            <p className="text-gray-600 mb-4">
              {message}
            </p>
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-green-700">
                Redirecting to dashboard in {countdown} seconds...
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Go to Dashboard Now
            </button>
          </div>
        );
        
      case 'error':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/resend-verification')}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Resend Verification Email
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Return to Home
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="flex items-center justify-center mb-8">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vorkanna</h1>
            <p className="text-gray-500 text-sm">Secure Email Verification</p>
          </div>
        </div>
        
        {renderContent()}
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-500 text-sm">
            Need help?{' '}
            <a
              href="mailto:support@vorkanna.com"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default VerificationRedirect;