import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheck } from 'react-icons/fa';
import { 
  X, Mail, Lock, LogIn, UserPlus, Eye, EyeOff, 
  ArrowLeft, AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  useLogin, 
  useRegister, 
  validatePassword,
  validateEmail,
  validatePhoneNumber,
  validateName,
  validateDateOfBirth,
  validateBio
} from "../hooks/useAuth";
import { useAuthStore } from "../store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import auth_modal_bg from '../assets/auth_modal_bg.png';

const AuthModal = ({ activeTab, onSwitchTab, onClose }) => {
  const navigate = useNavigate();
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  // Signin form state
  const [signinData, setSigninData] = useState({
    email: "",
    password: "",
    deviceToken: "",
    deviceType: "web"
  });

  // Signup form state with all new fields
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    gender: "",
    dateOfBirth: "",
    country: "",
    city: "",
    bio: "",
    languages: [],
    occupation: "",
    education: ""
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized data
  const benefits = useMemo(() => [
    {
      title: "Over 100 categories",
    },
    {
      title: "Quality work done faster",
    },
    {
      title: "Access to talent and businesses across the globe",
    }
  ], []);

  // Clear errors when switching tabs
  useEffect(() => {
    setErrors({});
    clearError();
    setShowEmailForm(false);
    setPasswordStrength('');
    setShowAdvancedFields(false);
  }, [activeTab, clearError]);

  // Prevent layout shift when modal opens
  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '';
    };
  }, []);

  const handleSigninChange = useCallback((e) => {
    const { name, value } = e.target;
    setSigninData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    clearError();
  }, [errors, clearError]);

  const handleSignupChange = useCallback((e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
    
    // Validate password on change
    if (name === 'password' && value) {
      const validation = validatePassword(value);
      if (!validation.valid) {
        setPasswordStrength(validation.message);
      } else {
        setPasswordStrength('Strong password');
      }
    } else if (name === 'password' && !value) {
      setPasswordStrength('');
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    clearError();
  }, [errors, clearError]);

  const validateSignin = useCallback(() => {
    const newErrors = {};
    
    if (!signinData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(signinData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!signinData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [signinData.email, signinData.password]);

  const validateSignup = useCallback(() => {
    const newErrors = {};

    // Required fields
    const nameValidation = validateName(signupData.name);
    if (!nameValidation.valid) {
      newErrors.name = nameValidation.message;
    }

    if (!signupData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(signupData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    const passwordValidation = validatePassword(signupData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message;
    }

    // Optional field validations
    if (signupData.phoneNumber && !validatePhoneNumber(signupData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }

    if (signupData.dateOfBirth) {
      const dobValidation = validateDateOfBirth(signupData.dateOfBirth);
      if (!dobValidation.valid) {
        newErrors.dateOfBirth = dobValidation.message;
      }
    }

    if (signupData.bio) {
      const bioValidation = validateBio(signupData.bio);
      if (!bioValidation.valid) {
        newErrors.bio = bioValidation.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [signupData]);

  const handleSigninSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateSignin()) return;

    setIsSubmitting(true);
    try {
      await loginMutation.mutateAsync(signinData);
      onClose();
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateSignin, loginMutation, signinData, onClose, navigate]);

  const handleSignupSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;

    setIsSubmitting(true);
    try {
      // Prepare registration data
      const registrationData = {
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
        phoneNumber: signupData.phoneNumber || undefined,
        gender: signupData.gender || undefined,
        dateOfBirth: signupData.dateOfBirth || undefined,
        country: signupData.country || undefined,
        city: signupData.city || undefined,
        bio: signupData.bio || undefined,
        languages: signupData.languages.length > 0 ? signupData.languages : undefined,
        occupation: signupData.occupation || undefined,
        education: signupData.education || undefined
      };

      await registerMutation.mutateAsync(registrationData);
      toast.success("Registration successful! Please check your email to verify your account.");
      onClose();
      navigate("/verify-email");
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateSignup, signupData, registerMutation, onClose, navigate]);

  // Google OAuth
  const handleGoogleAuth = useCallback(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Password strength indicator
  const getPasswordStrengthColor = useCallback(() => {
    if (!signupData.password) return 'gray';
    const validation = validatePassword(signupData.password);
    return validation.valid ? 'green' : 'red';
  }, [signupData.password]);

  // Password requirements checklist - memoized
  const passwordRequirements = useMemo(() => [
    { text: "At least 8 characters", met: signupData.password.length >= 8 },
    { text: "One uppercase letter", met: /[A-Z]/.test(signupData.password) },
    { text: "One lowercase letter", met: /[a-z]/.test(signupData.password) },
    { text: "One number", met: /\d/.test(signupData.password) },
    { text: "One special character (@$!%*?&)", met: /[@$!%*?&]/.test(signupData.password) },
  ], [signupData.password]);

  // Render social buttons view - NOT memoized, just a regular function
  const renderSocialButtons = () => (
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

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-base">
          <span className="px-4 bg-white text-gray-500 text-sm">Or</span>
        </div>
      </div>

      {/* Apple & Facebook Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => { }}
          disabled={loading || isSubmitting}
          className="flex-1 py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.94 5.19A4.38 4.38 0 0 0 16 2a4.44 4.44 0 0 0-3 1.52 4.17 4.17 0 0 0-1 3.09 3.69 3.69 0 0 0 2.94-1.42zm2.52 7.44a4.51 4.51 0 0 1 2.16-3.81 4.66 4.66 0 0 0-3.66-2c-1.56-.16-3 .91-3.83.91s-2-.89-3.3-.87a4.92 4.92 0 0 0-4.14 2.53C2.93 12.45 4.24 17 6 19.47c.8 1.21 1.8 2.58 3.12 2.53s1.75-.76 3.28-.76 2 .76 3.3.73 2.22-1.24 3.06-2.45a11 11 0 0 0 1.38-2.85a4.41 4.41 0 0 1-2.68-4.04z" />
          </svg>
          Apple
        </button>

        <button
          onClick={() => { }}
          disabled={loading || isSubmitting}
          className="flex-1 py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>
    </div>
  );

  // Render email form view - NOT memoized, just a regular function
  const renderEmailForm = () => (
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium text-sm">{error}</p>
        </div>
      )}

      {activeTab === 'signin' ? (
        /* SIGN IN EMAIL FORM */
        <form onSubmit={handleSigninSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={signinData.email}
              onChange={handleSigninChange}
              className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base"
              placeholder="you@example.com"
              disabled={loading || loginMutation.isPending || isSubmitting}
              autoFocus
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
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
                type={showPassword ? "text" : "password"}
                name="password"
                value={signinData.password}
                onChange={handleSigninChange}
                className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base pr-12"
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
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
              Remember me on this device
            </label>
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
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={signupData.name}
              onChange={handleSignupChange}
              className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base"
              placeholder="John Doe"
              disabled={loading || registerMutation.isPending || isSubmitting}
              autoFocus
              required
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={signupData.email}
              onChange={handleSignupChange}
              className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base"
              placeholder="you@example.com"
              disabled={loading || registerMutation.isPending || isSubmitting}
              required
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={signupData.password}
                onChange={handleSignupChange}
                className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base pr-12"
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
              <div className={`mt-3 p-3 rounded text-sm ${getPasswordStrengthColor() === 'green'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {passwordStrength}
                </div>
              </div>
            )}

            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{errors.password}</p>
            )}

            {/* Password requirements checklist */}
            <div className="mt-4 space-y-2">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center text-sm">
                  <div className={`w-3.5 h-3.5 rounded-full mr-2.5 ${req.met ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Terms Agreement */}
          <div className="flex items-start mt-6">
            <input
              type="checkbox"
              id="terms"
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
              required
            />
            <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
              I agree to the Vorkana Terms of Service and Privacy Policy. I understand that I will receive account-related emails.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || registerMutation.isPending || isSubmitting}
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

  // Simplified animations - useMemo for static animations
  const modalAnimation = useMemo(() => ({
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15, ease: "easeOut" }
  }), []);

  const backdropAnimation = useMemo(() => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 }
  }), []);

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
                <h1 className="text-3xl font-bold mt-2 mb-4">
                  Success starts here
                </h1>

                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <FaCheck className="mt-0.5 text-white text-sm" />
                      <h3 className="font-semibold text-base leading-tight">
                        {benefit.title}
                      </h3>
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
                          Don't have an account?{" "}
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
                          Already have an account?{" "}
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
                    By joining, you agree to the Vorkana Terms of Service and Privacy Policy.
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-2">
                    © {new Date().getFullYear()} Vorkana. All rights reserved.
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

export default React.memo(AuthModal);