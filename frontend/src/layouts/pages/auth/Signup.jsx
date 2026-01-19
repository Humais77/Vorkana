// layouts/pages/Signup.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, UserPlus, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRegister, validatePassword, validateEmail, validateName, usePasswordStrength } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/useAuthStore';
import { motion } from 'framer-motion';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { SeoWrapper } from '../../../components/SeoWrapper';
import { buildImageUrl } from '../../../utils/cloudinaryFrontend';
const Signup_Bg = buildImageUrl({
   publicId: "g4a7llwoypdpioirgrgv",
})
// Structured Data
const signupStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Sign Up for Vorkanna | Create Your Account',
  description: 'Create your Vorkanna account today. Join our global marketplace with over 100 service categories. Connect with talent and businesses worldwide.',
  url: typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup',
};

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
   const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const registerMutation = useRegister();

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

  // Handle URL parameters
  useEffect(() => {
    const checkOAuthResult = async () => {
      const oauthSuccess = searchParams.get('oauth_success');
      const error = searchParams.get('error');
      const data = searchParams.get('data');
      
      if (oauthSuccess === 'true' && data) {
        try {
          const userData = JSON.parse(decodeURIComponent(data));
          
          // Store user data in auth store
          useAuthStore.setState({
            user: userData.user,
            isAuthenticated: true,
            loading: false,
            error: null
          });
          
          // Clear URL params
          navigate('/dashboard', { replace: true });
          
          toast.success('Successfully signed in with Google!');
          
        } catch (err) {
          console.error('Error parsing OAuth data:', err);
          toast.error('Failed to process authentication');
        }
      }
      
      if (error === 'email_exists') {
        toast.error('Email already exists. Please sign in instead.');
        navigate('/signin', { replace: true });
      } else if (error === 'user_exists') {
        toast.error('User already exists. Please sign in.');
        navigate('/signin', { replace: true });
      } else if (error === 'auth_failed') {
        toast.error('Authentication failed. Please try again.');
      }
    };
    
    checkOAuthResult();
  }, [searchParams, navigate]);


  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (showBackendError) {
      setShowBackendError('');
    }
    
    clearError();
  };

  const validateSignup = () => {
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
  };

  const handleSignupSubmit = async (e) => {
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
        // Success handled by mutation
      } else {
        setShowBackendError(result.message || 'Registration failed');
      }
    } catch (error) {
      // Error handled by mutation's onError
      console.error('Registration submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
const handleGoogleAuth = () => {
    // Store where user came from
    const currentPath = window.location.pathname;
    document.cookie = `return_to=${currentPath}; path=/; max-age=300; samesite=strict`;
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };


  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.color) {
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const benefits = [
    { title: 'Over 100 categories' },
    { title: 'Quality work done faster' },
    { title: 'Access to talent and businesses across the globe' },
  ];

  const passwordRequirements = [
    { text: 'At least 8 characters', met: signupData.password.length >= 8 },
    { text: 'One uppercase letter', met: /[A-Z]/.test(signupData.password) },
    { text: 'One lowercase letter', met: /[a-z]/.test(signupData.password) },
    { text: 'One number', met: /\d/.test(signupData.password) },
    { text: 'One special character (@$!%*?&)', met: /[@$!%*?&]/.test(signupData.password) },
  ];

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

  const renderEmailForm = () => (
    <div className="overflow-y-auto max-h-[500px] pr-2">
      <button
        onClick={() => setShowEmailForm(false)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors text-base"
        disabled={isSubmitting}
        aria-label="Go back to social signup options"
      >
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
        Back
      </button>

      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Continue with your email</h2>
        <p className="text-gray-600 text-sm">Create your account to access our global marketplace</p>
      </div>

      {/* Error Display */}
      {(error || showBackendError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn" role="alert">
          <div className="flex items-start">
            <FaExclamationTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-700 font-medium text-sm">{error || showBackendError}</p>
              {(error || showBackendError)?.includes('already exists') && (
                <p className="text-red-600 text-xs mt-1">
                  Try logging in or use a different email address.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSignupSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-semibold text-gray-700 mb-2 block">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={signupData.name}
            onChange={handleSignupChange}
            className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base ${
              errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-emerald-500'
            }`}
            placeholder="John Doe"
            disabled={loading || registerMutation.isPending || isSubmitting}
            autoFocus
            required
            aria-required="true"
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={signupData.email}
            onChange={handleSignupChange}
            className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base ${
              errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-emerald-500'
            }`}
            placeholder="you@example.com"
            disabled={loading || registerMutation.isPending || isSubmitting}
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
          <label htmlFor="password" className="text-sm font-semibold text-gray-700 mb-2 block">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={signupData.password}
              onChange={handleSignupChange}
              className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base pr-12 ${
                errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-emerald-500'
              }`}
              placeholder="••••••••"
              disabled={loading || registerMutation.isPending || isSubmitting}
              required
              aria-required="true"
              aria-describedby={errors.password ? 'password-error' : 'password-help'}
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

          {/* Password strength indicator */}
          {signupData.password && (
            <div className="mt-3 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Password strength</span>
                <span className={`text-sm font-semibold ${
                  passwordStrength.color === 'green' ? 'text-green-600' :
                  passwordStrength.color === 'blue' ? 'text-blue-600' :
                  passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
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

          {errors.password && (
            <p id="password-error" className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">
              {errors.password}
            </p>
          )}

          {/* Password requirements */}
          <div className="mt-4 space-y-2" id="password-help" aria-label="Password requirements">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center text-sm">
                <div
                  className={`w-3.5 h-3.5 rounded-full mr-2.5 ${req.met ? 'bg-green-500' : 'bg-gray-300'}`}
                  aria-hidden="true"
                />
                <span className={req.met ? 'text-green-700' : 'text-gray-500'}>{req.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terms agreement */}
        <div className="mt-6">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                if (errors.terms) {
                  setErrors(prev => ({ ...prev, terms: '' }));
                }
              }}
              className={`w-4 h-4 mt-1 rounded focus:ring-2 focus:ring-emerald-100 ${
                errors.terms ? 'border-red-300 text-red-600' : 'border-gray-300 text-emerald-600'
              }`}
              required
              aria-required="true"
              aria-describedby={errors.terms ? 'terms-error' : undefined}
            />
            <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
              I agree to the{' '}
              <Link to="/terms" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Vorkanna Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Privacy Policy
              </Link>
              . I understand that I will receive account-related emails.
            </label>
          </div>
          {errors.terms && (
            <p id="terms-error" className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">
              {errors.terms}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || registerMutation.isPending || isSubmitting || !agreedToTerms}
          className="w-full py-3.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-base mt-4"
          aria-label={isSubmitting ? 'Creating account...' : 'Create your Vorkanna account'}
        >
          {registerMutation.isPending || isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true"></div>
              Creating Account...
            </>
          ) : (
            <>
              <UserPlus className="mr-2" size={20} aria-hidden="true" />
              Create Account
            </>
          )}
        </button>

        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              to="/signin"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
              aria-label="Sign in to your existing account"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );

  return (
    <SeoWrapper
      title="Sign Up for Vorkanna | Create Your Account"
      description="Create your Vorkanna account today. Join our global marketplace with over 100 service categories. Connect with talent and businesses worldwide."
      keywords="sign up, register, create account, Vorkanna, freelance, services, marketplace, work, talent, join"
      canonical={typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup'}
      structuredData={signupStructuredData}
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
              style={{ backgroundImage: `url(${Signup_Bg})` }}
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Create a new account</h1>
                    <p className="text-gray-600 text-base">
                      Already have an account?{' '}
                      <Link
                        to="/signin"
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                        disabled={isSubmitting}
                        aria-label="Sign in to your existing account"
                      >
                        Sign in
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
                    By joining, you agree to the{' '}
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

export default Signup;