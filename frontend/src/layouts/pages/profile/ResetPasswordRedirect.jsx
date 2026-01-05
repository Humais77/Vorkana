// src/components/auth/ResetPasswordRedirect.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../../../api/auth';
import { 
  Lock, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Shield
} from 'lucide-react';

const ResetPasswordRedirect = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('validating');
  const [message, setMessage] = useState('');
  const [validToken, setValidToken] = useState(null);
  
  useEffect(() => {
    const validateToken = async () => {
      try {
        setStatus('validating');
        
        if (!token || token.length !== 64) {
          setStatus('invalid');
          setMessage('Invalid reset token format');
          return;
        }
        
        // Store token for the reset page
        localStorage.setItem('resetToken', token);
        
        // Navigate to reset password page immediately
        navigate(`/reset-password?token=${token}`);
        
      } catch (error) {
        console.error('Token validation error:', error);
        setStatus('error');
        setMessage('Failed to validate reset token');
      }
    };
    
    validateToken();
  }, [token, navigate]);
  
  const renderContent = () => {
    switch (status) {
      case 'validating':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Validating Reset Link
            </h2>
            <p className="text-gray-600">
              Please wait while we validate your password reset link...
            </p>
          </div>
        );
        
      case 'invalid':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Invalid Reset Link
            </h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Request New Reset Link
              </button>
              <button
                onClick={() => navigate('/signin')}
                className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Back to Sign In
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
          <Shield className="w-10 h-10 text-emerald-600 mr-2" />
          <span className="text-2xl font-bold text-gray-900">Vorkanna</span>
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

export default ResetPasswordRedirect;