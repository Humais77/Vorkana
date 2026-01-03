// VerifyEmail.jsx - Updated with request prevention
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVerifyEmail } from '../../../hooks/useAuth';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Shield,
  Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const verifyEmail = useVerifyEmail();
  
  const [status, setStatus] = useState('verifying');
  const [email, setEmail] = useState('');
  const hasVerified = useRef(false); // Prevent multiple verifications

  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    if (token && !hasVerified.current) {
      hasVerified.current = true; // Mark that we're processing
      handleVerification(token);
    } else if (!token) {
      setStatus('noToken');
    }
  }, [searchParams]);

  const handleVerification = async (token) => {
    try {
      setStatus('verifying');
      const result = await verifyEmail.mutateAsync(token);
      
      if (result.success) {
        if (result.alreadyVerified) {
          // User was already verified
          setStatus('alreadyVerified');
          setEmail(result.email);
          toast.success('Email was already verified!');
        } else {
          // New verification
          setStatus('success');
          setEmail(result.email);
          toast.success('Email verified successfully!');
        }
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/signin', { 
            state: { 
              message: 'Email verified! Please login to continue.',
              email: result.email 
            }
          });
        }, 3000);
      } else {
        setStatus('error');
        toast.error(result.message || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      console.error('Verification error:', error);
      
      // Check if it's an "already verified" error
      if (error.response?.data?.code === 'ALREADY_VERIFIED') {
        setStatus('alreadyVerified');
        toast.success('Email was already verified!');
        setTimeout(() => {
          navigate('/signin');
        }, 3000);
      } else {
        toast.error('Verification failed. Please try again.');
      }
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Verifying your email
            </h2>
            <p className="text-gray-600 mb-8">
              Please wait while we verify your email address...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Email Verified Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your email <span className="font-semibold">{email}</span> has been verified.
            </p>
            <p className="text-gray-500 mb-8 text-sm">
              Redirecting you to login...
            </p>
            <div className="space-y-4">
              <Link
                to="/signin"
                className="block py-3 px-6 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Go to Login Now
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Refresh page
              </button>
            </div>
          </div>
        );

      case 'alreadyVerified':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Already Verified!
            </h2>
            <p className="text-gray-600 mb-6">
              Your email <span className="font-semibold">{email}</span> is already verified.
            </p>
            <p className="text-gray-500 mb-8 text-sm">
              Redirecting you to login...
            </p>
            <Link
              to="/signin"
              className="inline-block py-3 px-6 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Go to Login Now
            </Link>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-6">
              The verification link is invalid or has expired.
            </p>
            <div className="space-y-4">
              <Link
                to="/signin"
                className="block py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Go to Login
              </Link>
              <Link
                to="/"
                className="block py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Return to Home
              </Link>
            </div>
          </div>
        );

      case 'noToken':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
              <Mail className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Check Your Email
            </h2>
            <p className="text-gray-600 mb-6">
              Please check your email for the verification link.
            </p>
            {email && (
              <p className="text-gray-500 mb-6 text-sm">
                Sent to: <span className="font-semibold">{email}</span>
              </p>
            )}
            <div className="space-y-4">
              <Link
                to="/signin"
                className="block py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Go to Login
              </Link>
              <Link
                to="/"
                className="block py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Return to Home
              </Link>
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
              href="mailto:support@Vorkanna.com"
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

export default VerifyEmail;