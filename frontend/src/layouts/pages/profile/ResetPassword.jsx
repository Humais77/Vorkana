import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useResetPassword, useCheckResetToken } from '../../../hooks/useAuth';
import { validatePassword } from '../../../api/auth';
import { 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Shield,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetPassword = useResetPassword();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [tokenValid, setTokenValid] = useState(null); // null = loading, true = valid, false = invalid
  const [token, setToken] = useState('');
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const hasValidated = useRef(false);

  useEffect(() => {
    const validateToken = async () => {
      if (hasValidated.current) return;
      
      const urlToken = searchParams.get('token');
      const localStorageToken = localStorage.getItem('resetToken');
      
      const finalToken = urlToken || localStorageToken;
      
      if (!finalToken) {
        setTokenValid(false);
        setIsValidatingToken(false);
        toast.error('No reset token found');
        return;
      }
      
      // Validate token format
      if (finalToken.length !== 64) {
        setTokenValid(false);
        setIsValidatingToken(false);
        toast.error('Invalid reset token format');
        return;
      }
      
      setToken(finalToken);
      
      // Clean up localStorage
      if (localStorageToken) {
        localStorage.removeItem('resetToken');
      }
      
      // You can add an API call here to validate the token
      // For now, we'll just accept the token format
      setTokenValid(true);
      setIsValidatingToken(false);
      hasValidated.current = true;
    };

    validateToken();
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'password') {
      const validation = validatePassword(value);
      if (!validation.valid) {
        setPasswordStrength(validation.message);
      } else {
        setPasswordStrength('Strong password');
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const validation = validatePassword(formData.password);
      if (!validation.valid) {
        newErrors.password = validation.message;
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token || tokenValid !== true) {
      toast.error('Invalid reset link');
      navigate('/forgot-password');
      return;
    }

    if (!validateForm()) return;

    try {
      const result = await resetPassword.mutateAsync({
        token,
        newPassword: formData.password
      });

      if (result.success) {
        toast.success('Password reset successfully!');
        
        // Clear the form
        setFormData({ password: '', confirmPassword: '' });
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/signin', { 
            state: { 
              message: 'Password reset successful! Please login with your new password.',
              autoClear: true
            }
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message;
        if (errorMessage?.includes('expired')) {
          toast.error('Reset link has expired. Please request a new one.');
          setTimeout(() => {
            navigate('/forgot-password');
          }, 1500);
        } else if (errorMessage?.includes('Invalid')) {
          toast.error('Invalid reset link. Please request a new one.');
          setTimeout(() => {
            navigate('/forgot-password');
          }, 1500);
        } else if (errorMessage?.includes('Password must contain')) {
          // Password validation error - already shown in form
        } else {
          toast.error(errorMessage || 'Failed to reset password');
        }
      } else if (error.response?.status === 429) {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error('Failed to reset password. Please try again.');
      }
    }
  };

  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Verifying Reset Link
          </h2>
          <p className="text-gray-600">
            Please wait while we validate your password reset link...
          </p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Invalid Reset Link
          </h2>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired.
            Please request a new password reset link.
          </p>
          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="block py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Request New Reset Link
            </Link>
            <Link
              to="/signin"
              className="block py-2 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Back to Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const passwordRequirements = [
    { text: "At least 8 characters", met: formData.password.length >= 8 },
    { text: "One uppercase letter", met: /[A-Z]/.test(formData.password) },
    { text: "One lowercase letter", met: /[a-z]/.test(formData.password) },
    { text: "One number", met: /\d/.test(formData.password) },
    { text: "One special character (@$!%*?&)", met: /[@$!%*?&]/.test(formData.password) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);

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

        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <Lock className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-600">
            Create a new secure password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors pr-10 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } ${formData.password && allRequirementsMet ? 'border-green-500' : ''}`}
                placeholder="Enter new password"
                disabled={resetPassword.isPending}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={resetPassword.isPending}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {formData.password && passwordStrength && (
              <div className={`mt-2 p-2 rounded text-sm ${
                errors.password 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : allRequirementsMet
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                <div className="flex items-center">
                  {allRequirementsMet ? (
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  )}
                  {passwordStrength}
                </div>
              </div>
            )}

            {errors.password && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.password}
              </p>
            )}

            {/* Password requirements */}
            <div className="mt-3 space-y-1">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center text-sm">
                  <div className={`w-3 h-3 rounded-full mr-2 flex items-center justify-center ${req.met ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {req.met && <CheckCircle className="w-2 h-2 text-white" />}
                  </div>
                  <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors pr-10 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                } ${formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-green-500' : ''}`}
                placeholder="Confirm new password"
                disabled={resetPassword.isPending}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={resetPassword.isPending}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <p className="mt-2 text-sm text-green-600 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Passwords match
              </p>
            )}
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={resetPassword.isPending || !allRequirementsMet || formData.password !== formData.confirmPassword}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetPassword.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-500 text-sm">
            Remember your password?{' '}
            <Link
              to="/signin"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;