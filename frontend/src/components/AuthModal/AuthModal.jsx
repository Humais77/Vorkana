// components/AuthModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { X, Mail, Lock, LogIn, UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLogin, useRegister, validatePassword, validateEmail, validateName, usePasswordStrength } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import auth_modal_bg from '../../assets/auth_modal_bg.png';

const AuthModal = ({ activeTab, onSwitchTab, onClose }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  // Signin form state
  const [signinData, setSigninData] = useState({
    email: '',
    password: '',
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBackendError, setShowBackendError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const passwordStrength = usePasswordStrength(signupData.password);

  // Memoized data
  const benefits = useMemo(
    () => [
      { title: 'Over 100 categories' },
      { title: 'Quality work done faster' },
      { title: 'Access to talent and businesses across the globe' },
    ],
    []
  );

  // Handle URL parameters
  useEffect(() => {
    const error = searchParams.get('error');
    const email = searchParams.get('email');
    const verified = searchParams.get('verified');

    if (error === 'email_exists') {
      toast.error(`Email ${email || ''} is already registered with Google. Please login with Google.`);
      onSwitchTab('signin');
      setShowEmailForm(true);
      if (email) {
        setSigninData(prev => ({ ...prev, email }));
      }
      // Clear URL params
      searchParams.delete('error');
      searchParams.delete('email');
      setSearchParams(searchParams);
    } else if (verified === 'true') {
      toast.success('Email verified successfully! You can now login.');
      onSwitchTab('signin');
      setShowEmailForm(true);
      if (email) {
        setSigninData(prev => ({ ...prev, email }));
      }
    }
  }, [searchParams, setSearchParams, onSwitchTab]);

  // Clear errors when switching tabs or closing modal
  useEffect(() => {
    return () => {
      clearError();
      setErrors({});
      setShowBackendError('');
    };
  }, [clearError, activeTab]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSigninChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setSigninData(prev => ({ ...prev, [name]: value }));

      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }

      if (showBackendError) {
        setShowBackendError('');
      }

      clearError();
    },
    [errors, showBackendError, clearError]
  );

  const handleSignupChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setSignupData(prev => ({ ...prev, [name]: value }));

      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }

      if (showBackendError) {
        setShowBackendError('');
      }

      clearError();
    },
    [errors, showBackendError, clearError]
  );

  const validateSignin = useCallback(() => {
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
  }, [signinData.email, signinData.password]);

  const validateSignup = useCallback(() => {
    const newErrors = {};

    const nameValidation = validateName(signupData.name);
    if (!nameValidation.valid) {
      newErrors.name = nameValidation.message;
    }

    if (!signupData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(signupData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    const passwordValidation = validatePassword(signupData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message;
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [signupData, agreedToTerms]);

  const handleSigninSubmit = useCallback(
    async e => {
      e.preventDefault();
      if (!validateSignin()) return;

      setIsSubmitting(true);
      clearError();
      setShowBackendError('');

      try {
        const result = await loginMutation.mutateAsync(signinData);
        
        if (result.success) {
          onClose();
          navigate('/dashboard');
        } else {
          setShowBackendError(result.message || 'Login failed');
        }
      } catch (error) {
        console.error('Login submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateSignin, loginMutation, signinData, onClose, navigate, clearError]
  );

  const handleSignupSubmit = useCallback(
    async e => {
      e.preventDefault();
      if (!validateSignup()) return;

      setIsSubmitting(true);
      clearError();
      setShowBackendError('');

      try {
        const registrationData = {
          name: signupData.name.trim(),
          email: signupData.email.toLowerCase().trim(),
          password: signupData.password,
        };

        const result = await registerMutation.mutateAsync(registrationData);
        
        if (result.success) {
          toast.success('Registration successful! Please check your email to verify your account.');
          onClose();
          navigate('/verify-email');
        } else {
          setShowBackendError(result.message || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateSignup, signupData, registerMutation, onClose, navigate, clearError]
  );

  const handleGoogleAuth = useCallback(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/api/auth/google`;
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const getPasswordStrengthColor = useCallback(() => {
    switch (passwordStrength.color) {
      case 'green':
        return 'bg-green-500';
      case 'blue':
        return 'bg-blue-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  }, [passwordStrength.color]);

  const passwordRequirements = useMemo(() => {
    const pwd = signupData.password;
    return [
      { text: 'At least 8 characters', met: pwd.length >= 8 },
      { text: 'One uppercase letter', met: /[A-Z]/.test(pwd) },
      { text: 'One lowercase letter', met: /[a-z]/.test(pwd) },
      { text: 'One number', met: /\d/.test(pwd) },
      { text: 'One special character (@$!%*?&)', met: /[@$!%*?&]/.test(pwd) },
    ];
  }, [signupData.password]);

  // Render social buttons
  const renderSocialButtons = useCallback(
    () => (
      <div className="space-y-4">
        <button
          onClick={handleGoogleAuth}
          disabled={loading || isSubmitting}
          className="w-full py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-base"
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-5 h-5 mr-3"
            loading="lazy"
          />
          Continue with Google
        </button>

        <button
          onClick={() => setShowEmailForm(true)}
          disabled={loading || isSubmitting}
          className="w-full py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-base"
        >
          <Mail className="w-5 h-5 mr-3" />
          Continue with {activeTab === 'signin' ? 'email' : 'email'}
        </button>
      </div>
    ),
    [activeTab, handleGoogleAuth, loading, isSubmitting]
  );

  // Render email form
  const renderEmailForm = useCallback(() => {
    const handleEmailBlur = (field, value) => {
      if (field === 'email' && value && !validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      }
    };

    const handlePasswordBlur = (value, isSignup = false) => {
      if (!value) {
        setErrors(prev => ({ ...prev, password: 'Password is required' }));
      } else if (isSignup) {
        const validation = validatePassword(value);
        if (!validation.valid) {
          setErrors(prev => ({ ...prev, password: validation.message }));
        }
      }
    };

    const handleNameBlur = value => {
      if (value) {
        const validation = validateName(value);
        if (!validation.valid) {
          setErrors(prev => ({ ...prev, name: validation.message }));
        }
      }
    };

    return (
      <div className="overflow-y-auto max-h-[500px] pr-2">
        {/* Back Button */}
        <button
          onClick={() => setShowEmailForm(false)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors text-base"
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Continue with your email {activeTab === 'signup' ? '' : 'or username'}
          </h3>
        </div>

        {/* Error Display */}
        {(error || showBackendError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
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
                  <p className="text-red-600 text-xs mt-1">Check your email for the verification link.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'signin' ? (
          /* SIGN IN EMAIL FORM */
          <form onSubmit={handleSigninSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Email Address</label>
              <input
                type="email"
                name="email"
                value={signinData.email}
                onChange={handleSigninChange}
                onBlur={e => handleEmailBlur('email', e.target.value)}
                className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base ${
                  errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-emerald-500'
                }`}
                placeholder="you@example.com"
                disabled={loading || loginMutation.isPending || isSubmitting}
                autoFocus
              />
              {errors.email && <p className="mt-2 text-sm text-red-600 animate-fadeIn">{errors.email}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <button
                  type="button"
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  onClick={() => {
                    onClose();
                    navigate('/forgot-password');
                  }}
                  disabled={isSubmitting}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={signinData.password}
                  onChange={handleSigninChange}
                  onBlur={e => handlePasswordBlur(e.target.value, false)}
                  className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base pr-12 ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-emerald-500'
                  }`}
                  placeholder="••••••••"
                  disabled={loading || loginMutation.isPending || isSubmitting}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-sm text-red-600 animate-fadeIn">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || loginMutation.isPending || isSubmitting}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loginMutation.isPending || isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="mr-2" size={20} />
                  Sign In
                </>
              )}
            </button>
          </form>
        ) : (
          /* SIGN UP EMAIL FORM */
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Full Name *</label>
              <input
                type="text"
                name="name"
                value={signupData.name}
                onChange={handleSignupChange}
                onBlur={e => handleNameBlur(e.target.value)}
                className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base ${
                  errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-emerald-500'
                }`}
                placeholder="John Doe"
                disabled={loading || registerMutation.isPending || isSubmitting}
                autoFocus
                required
              />
              {errors.name && <p className="mt-2 text-sm text-red-600 animate-fadeIn">{errors.name}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Email Address *</label>
              <input
                type="email"
                name="email"
                value={signupData.email}
                onChange={handleSignupChange}
                onBlur={e => handleEmailBlur('email', e.target.value)}
                className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base ${
                  errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-emerald-500'
                }`}
                placeholder="you@example.com"
                disabled={loading || registerMutation.isPending || isSubmitting}
                required
              />
              {errors.email && <p className="mt-2 text-sm text-red-600 animate-fadeIn">{errors.email}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={signupData.password}
                  onChange={handleSignupChange}
                  onBlur={e => handlePasswordBlur(e.target.value, true)}
                  className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base pr-12 ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-emerald-500'
                  }`}
                  placeholder="••••••••"
                  disabled={loading || registerMutation.isPending || isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Password strength indicator */}
              {signupData.password && (
                <div className="mt-3 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Password strength</span>
                    <span
                      className={`text-sm font-semibold ${
                        passwordStrength.color === 'green'
                          ? 'text-green-600'
                          : passwordStrength.color === 'blue'
                          ? 'text-blue-600'
                          : passwordStrength.color === 'yellow'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                </div>
              )}

              {errors.password && <p className="mt-2 text-sm text-red-600 animate-fadeIn">{errors.password}</p>}

              {/* Password requirements */}
              <div className="mt-4 space-y-2">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <div className={`w-3.5 h-3.5 rounded-full mr-2.5 ${req.met ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={req.met ? 'text-green-700' : 'text-gray-500'}>{req.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start mt-6">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={e => {
                  setAgreedToTerms(e.target.checked);
                  if (errors.terms) {
                    setErrors(prev => ({ ...prev, terms: '' }));
                  }
                }}
                className={`w-4 h-4 mt-1 rounded focus:ring-2 focus:ring-emerald-100 ${
                  errors.terms ? 'border-red-300 text-red-600' : 'border-gray-300 text-emerald-600'
                }`}
                required
              />
              <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
                I agree to the Vorkanna Terms of Service and Privacy Policy. I understand that I will receive
                account-related emails.
              </label>
            </div>
            {errors.terms && <p className="mt-2 text-sm text-red-600 animate-fadeIn">{errors.terms}</p>}

            <button
              type="submit"
              disabled={loading || registerMutation.isPending || isSubmitting || !agreedToTerms}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-base mt-4"
            >
              {registerMutation.isPending || isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2" size={20} />
                  Create Account
                </>
              )}
            </button>

            <p className="text-sm text-gray-500 text-center mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  onSwitchTab('signin');
                  setShowEmailForm(false);
                }}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
                disabled={isSubmitting}
              >
                Sign in here
              </button>
            </p>
          </form>
        )}
      </div>
    );
  }, [
    activeTab,
    error,
    showBackendError,
    signinData,
    signupData,
    showPassword,
    loading,
    loginMutation.isPending,
    registerMutation.isPending,
    isSubmitting,
    agreedToTerms,
    passwordStrength,
    passwordRequirements,
    handleSigninChange,
    handleSignupChange,
    handleSigninSubmit,
    handleSignupSubmit,
    togglePasswordVisibility,
    getPasswordStrengthColor,
    onClose,
    navigate,
    onSwitchTab,
  ]);

  // Animations
  const modalAnimation = useMemo(
    () => ({
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.15, ease: 'easeOut' },
    }),
    []
  );

  const backdropAnimation = useMemo(
    () => ({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
    }),
    []
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          {...backdropAnimation}
          className="absolute inset-0 bg-black/30"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          {...modalAnimation}
          className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex h-[600px]">
            {/* Left Side - Benefits */}
            <div
              className="hidden lg:flex flex-col w-[45%] p-8 text-white bg-cover bg-center relative"
              style={{ backgroundImage: `url(${auth_modal_bg})` }}
            >
              <div className="flex-1">
                <h1 className="text-3xl font-bold mt-2 mb-4">Success starts here</h1>

                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <FaCheck className="mt-0.5 text-white text-sm" />
                      <h3 className="font-semibold text-base leading-tight">{benefit.title}</h3>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Auth Content */}
            <div className="flex-1 flex justify-center items-center p-8">
              <div className="max-w-sm mx-auto h-full flex flex-col">
                {/* Header with tab switch - Only show in social view */}
                {!showEmailForm && (
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                      {activeTab === 'signin' ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                    <p className="text-gray-600 text-base">
                      {activeTab === 'signin' ? (
                        <>
                          Don't have an account?{' '}
                          <button
                            onClick={() => onSwitchTab('signup')}
                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                            disabled={isSubmitting}
                          >
                            Join here
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{' '}
                          <button
                            onClick={() => onSwitchTab('signin')}
                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                            disabled={isSubmitting}
                          >
                            Sign in
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* Content Area */}
                <div className={`flex-1 ${showEmailForm ? 'flex flex-col justify-center' : ''}`}>
                  {showEmailForm ? renderEmailForm() : renderSocialButtons()}
                </div>

                {/* Footer Terms */}
                <div className="pt-6 border-t border-gray-200 mt-6">
                  <p className="text-center text-gray-600 text-sm">
                    By joining, you agree to the Vorkanna Terms of Service and Privacy Policy.
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-2">
                    © {new Date().getFullYear()} Vorkanna. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;