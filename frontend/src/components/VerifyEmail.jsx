import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVerifyEmail, useResendVerification } from '../hooks/useAuth';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  RefreshCw,
  Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const verifyEmail = useVerifyEmail();
  const resendVerification = useResendVerification();
  const { user, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    if (token) {
      handleVerification();
    }
  }, [token]);

  const handleVerification = async () => {
    try {
      const result = await verifyEmail.mutateAsync(token);
      if (result.success) {
        setStatus('success');
        toast.success('Email verified successfully!');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  const handleResendEmail = async () => {
    if (!user?.email) {
      toast.error('No email found');
      return;
    }

    try {
      await resendVerification.mutateAsync(user.email);
      toast.success('Verification email sent!');
    } catch (error) {
      toast.error('Failed to resend verification email');
    }
  };

  const handleContinue = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signin');
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
            <div className="animate-pulse space-y-2">
              <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
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
            <p className="text-gray-600 mb-8">
              Your email has been verified. You now have full access to all Vorkana features.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center"
              >
                Continue to Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
              <Link
                to="/"
                className="block py-2 text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Return to Home
              </Link>
            </div>
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
          <button
            onClick={handleResendEmail}
            disabled={resendVerification.isPending}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50"
          >
            {resendVerification.isPending ? (
              <>
                <RefreshCw className="mr-2 w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 w-5 h-5" />
                Resend Verification Email
              </>
            )}
          </button>
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
        <span className="text-2xl font-bold text-gray-900">Vorkana</span>
      </div>

      {renderContent()}

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-center text-gray-500 text-sm">
          Need help?{' '}
          <a
            href="mailto:support@vorkana.com"
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