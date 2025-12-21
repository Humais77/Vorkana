import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { authAPI } from '../api/auth';

const VerifiedPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const status = searchParams.get('status');
    const token = searchParams.get('token');

    switch (status) {
      case 'success':
        if (token) {
          // Store the token
          localStorage.setItem('userToken', token);
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to dashboard...');
          
          // Fetch user info
          setTimeout(() => {
            authAPI.getProfile()
              .then(() => {
                navigate('/dashboard');
              })
              .catch(() => {
                navigate('/signin');
              });
          }, 2000);
        }
        break;
        
      case 'already':
        setStatus('info');
        setMessage('Email is already verified. Redirecting to login...');
        setTimeout(() => navigate('/signin'), 2000);
        break;
        
      default:
        setStatus('error');
        setMessage('Invalid verification status');
        setTimeout(() => navigate('/'), 3000);
    }
  }, [searchParams, navigate, setAuth]);

  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
            >
              <CheckCircle className="w-12 h-12 text-green-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Email Verified!
            </h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          </div>
        );
        
      case 'info':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Already Verified
            </h2>
            <p className="text-gray-600 mb-8">{message}</p>
          </div>
        );
        
      case 'error':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Return Home
            </button>
          </div>
        );
        
      default:
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <RefreshCw className="w-12 h-12 text-gray-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Processing...
            </h2>
            <p className="text-gray-600">Please wait while we verify your email.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {renderContent()}
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-500 text-sm">
            Having issues?{' '}
            <a
              href="mailto:support@vorkana.com"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifiedPage;