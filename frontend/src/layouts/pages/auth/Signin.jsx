// layouts/pages/Signin.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLogin, validateEmail } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/useAuthStore';
import { motion } from 'framer-motion';
import auth_modal_bg from '../../../assets/auth_modal_bg.png';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { SeoWrapper } from '../../../components/SeoWrapper';

// Structured Data
const signinStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Sign In to Vorkanna | Access Your Account',
  description: 'Sign in to your Vorkanna account to access over 100 categories of services, find quality work done faster, and connect with talent worldwide.',
  url: typeof window !== 'undefined' ? `${window.location.origin}/signin` : '/signin',
};

const Signin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const loginMutation = useLogin();

  const [signinData, setSigninData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBackendError, setShowBackendError] = useState('');

  // Handle URL parameters for errors/notifications
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const verified = searchParams.get('verified');
    const email = searchParams.get('email');

    if (error === 'email_exists') {
      toast.error(`Email ${email || ''} is already registered with Google. Please login with Google.`);
      setShowEmailForm(true);
      if (email) {
        setSigninData(prev => ({ ...prev, email }));
      }
    } else if (error === 'auth_failed') {
      toast.error('Authentication failed. Please try again.');
    } else if (verified === 'true') {
      toast.success('Email verified successfully! You can now login.');
      if (email) {
        setSigninData(prev => ({ ...prev, email }));
        setShowEmailForm(true);
      }
    } else if (message) {
      toast(message);
    }

    // Clear URL parameters
    if (error || message || verified) {
      navigate('/signin', { replace: true });
    }
  }, [searchParams, navigate]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSigninChange = (e) => {
    const { name, value } = e.target;
    setSigninData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear backend error when user types
    if (showBackendError) {
      setShowBackendError('');
    }
    
    clearError();
  };

  const validateSignin = () => {
    const newErrors = {};
    
    if (!signinData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(signinData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!signinData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSigninSubmit = async (e) => {
    e.preventDefault();
    if (!validateSignin()) return;

    setIsSubmitting(true);
    clearError();
    setShowBackendError('');

    try {
      const result = await loginMutation.mutateAsync(signinData);
      
      if (result.success) {
        // Success handled by mutation
      } else {
        // Show backend error if mutation succeeded but returned error
        setShowBackendError(result.message || 'Login failed');
      }
    } catch (error) {
      // Error handled by mutation's onError
      console.error('Login submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const benefits = [
    { title: 'Over 100 categories' },
    { title: 'Quality work done faster' },
    { title: 'Access to talent and businesses across the globe' },
  ];

  // Render social buttons
  const renderSocialButtons = () => (
    <div className="space-y-4">
      <button
        onClick={handleGoogleAuth}
        disabled={loading || isSubmitting}
        className="w-full py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-base"
        aria-label="Continue with Google"
      >
        <img
          src="https://www.google.com/favicon.ico"
          alt="Google logo"
          className="w-5 h-5 mr-3"
          loading="lazy"
          width="20"
          height="20"
        />
        Continue with Google
      </button>

      <button
        onClick={() => setShowEmailForm(true)}
        disabled={loading || isSubmitting}
        className="w-full py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-base"
        aria-label="Continue with email"
      >
        <Mail className="w-5 h-5 mr-3" aria-hidden="true" />
        Continue with email
      </button>
    </div>
  );

  // Render email form
  const renderEmailForm = () => (
    <div className="overflow-y-auto max-h-[500px] pr-2">
      <button
        onClick={() => setShowEmailForm(false)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors text-base"
        disabled={isSubmitting}
        aria-label="Go back to social login options"
      >
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
        Back
      </button>

      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Continue with your email</h2>
        <p className="text-gray-600 text-sm">Enter your credentials to access your account</p>
      </div>

      {/* Error Display */}
      {(error || showBackendError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn" role="alert">
          <div className="flex items-start">
            <FaExclamationTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-700 font-medium text-sm">{error || showBackendError}</p>
              {(error || showBackendError)?.includes('locked') && (
                <p className="text-red-600 text-xs mt-1">
                  Please wait or contact support if you believe this is an error.
                </p>
              )}
              {(error || showBackendError)?.includes('verify') && (
                <p className="text-red-600 text-xs mt-1">
                  Check your email for the verification link.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSigninSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={signinData.email}
            onChange={handleSigninChange}
            className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base ${
              errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-emerald-500'
            }`}
            placeholder="you@example.com"
            disabled={loading || loginMutation.isPending || isSubmitting}
            autoFocus
            required
            aria-required="true"
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="password" className="text-sm font-semibold text-gray-700">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              aria-label="Reset your password"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={signinData.password}
              onChange={handleSigninChange}
              className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base pr-12 ${
                errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-emerald-500'
              }`}
              placeholder="••••••••"
              disabled={loading || loginMutation.isPending || isSubmitting}
              required
              aria-required="true"
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isSubmitting}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="rememberMe"
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            aria-label="Remember me on this device"
          />
          <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
            Remember me on this device
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || loginMutation.isPending || isSubmitting}
          className="w-full py-3.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-base"
          aria-label={isSubmitting ? 'Signing in...' : 'Sign in to your account'}
        >
          {loginMutation.isPending || isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true"></div>
              Signing In...
            </>
          ) : (
            <>
              <LogIn className="mr-2" size={20} aria-hidden="true" />
              Sign In
            </>
          )}
        </button>

        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
              aria-label="Create a new account"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );

  return (
    <SeoWrapper
      title="Sign In to Vorkanna | Access Your Account"
      description="Sign in to your Vorkanna account to access over 100 categories of services, find quality work done faster, and connect with talent worldwide."
      keywords="sign in, login, Vorkanna, freelance, services, marketplace, work, talent, account"
      canonical={typeof window !== 'undefined' ? `${window.location.origin}/signin` : '/signin'}
      structuredData={signinStructuredData}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
        <motion.main
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden"
          role="main"
        >
          <div className="flex h-[600px]">
            {/* Left Side - Benefits */}
            <aside
              className="hidden lg:flex flex-col w-[45%] p-8 text-white bg-cover bg-center relative"
              style={{ backgroundImage: `url(${auth_modal_bg})` }}
              role="complementary"
              aria-label="Benefits of joining Vorkanna"
            >
              <div className="flex-1">
                <h1 className="text-3xl font-bold mt-2 mb-4">Success starts here</h1>

                <ul className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <FaCheck className="mt-0.5 text-white text-sm" aria-hidden="true" />
                      <h3 className="font-semibold text-base leading-tight">{benefit.title}</h3>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Right Side - Auth Content */}
            <section className="flex-1 flex justify-center items-center p-8">
              <div className="max-w-sm mx-auto h-full flex flex-col">
                {/* Header with tab switch - Only show in social view */}
                {!showEmailForm && (
                  <header className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Sign in to your account</h1>
                    <p className="text-gray-600 text-base">
                      Don't have an account?{' '}
                      <Link
                        to="/signup"
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                        disabled={isSubmitting}
                        aria-label="Create a new account on Vorkanna"
                      >
                        Join here
                      </Link>
                    </p>
                  </header>
                )}

                {/* Content Area */}
                <div className={`flex-1 ${showEmailForm ? 'flex flex-col justify-center' : ''}`}>
                  {showEmailForm ? renderEmailForm() : renderSocialButtons()}
                </div>

                {/* Footer Terms */}
                <footer className="pt-6 border-t border-gray-200 mt-6">
                  <p className="text-center text-gray-600 text-sm">
                    By signing in, you agree to the{' '}
                    <Link to="/terms" className="text-emerald-600 hover:text-emerald-700">
                      Vorkanna Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-emerald-600 hover:text-emerald-700">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-2">
                    © {new Date().getFullYear()} Vorkanna. All rights reserved.
                  </p>
                </footer>
              </div>
            </section>
          </div>
        </motion.main>
      </div>
    </SeoWrapper>
  );
};

export default Signin;