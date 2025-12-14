import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Mail, Lock, LogIn, UserPlus, Eye, EyeOff, Globe, Check, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { useLogin, useRegister, validatePassword } from "../hooks/useAuth";
import { useAuthStore } from "../store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

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
  });
  
  // Signup form state
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  // Clear errors when switching tabs
  useEffect(() => {
    setErrors({});
    clearError();
    setShowEmailForm(false);
    setPasswordStrength('');
  }, [activeTab, clearError]);

  // Check password strength on change
  useEffect(() => {
    if (signupData.password) {
      const validation = validatePassword(signupData.password);
      if (!validation.valid) {
        setPasswordStrength(validation.message);
      } else {
        setPasswordStrength('Strong password');
      }
    } else {
      setPasswordStrength('');
    }
  }, [signupData.password]);

  const handleSigninChange = (e) => {
    const { name, value } = e.target;
    setSigninData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    clearError();
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    clearError();
  };

  const validateSignin = () => {
    const newErrors = {};
    if (!signinData.email) newErrors.email = "Email is required";
    if (!signinData.password) newErrors.password = "Password is required";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (signinData.email && !emailRegex.test(signinData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors = {};
    
    if (!signupData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (signupData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (signupData.name.trim().length > 50) {
      newErrors.name = "Name cannot exceed 50 characters";
    }
    
    if (!signupData.email) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(signupData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }
    
    if (!signupData.password) {
      newErrors.password = "Password is required";
    } else {
      const validation = validatePassword(signupData.password);
      if (!validation.valid) {
        newErrors.password = validation.message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSigninSubmit = async (e) => {
    e.preventDefault();
    if (!validateSignin()) return;

    try {
      await loginMutation.mutateAsync(signinData);
      onClose();
      // Navigate based on user role
      const user = useAuthStore.getState().user;
      if (user?.role === 'seller') {
        navigate("/seller/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;

    try {
      await registerMutation.mutateAsync(signupData);
      toast.success("Please check your email to verify your account.");
      onClose();
      navigate("/verify-email");
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handleGoogleAuth = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
    const width = 600;
  const height = 600;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  
  window.open(
    `${backendUrl}/api/auth/google`,
    'Google Login',
    `width=${width},height=${height},top=${top},left=${left}`
  );
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Password strength indicator
  const getPasswordStrengthColor = () => {
    if (!signupData.password) return 'gray';
    const validation = validatePassword(signupData.password);
    return validation.valid ? 'green' : 'red';
  };

  // Benefits content
  const benefits = [
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Over 100 categories",
      description: "Find the perfect service for your needs"
    },
    {
      icon: <Check className="w-5 h-5" />,
      title: "Quality work done faster",
      description: "Get professional results in no time"
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Global talent access",
      description: "Connect with professionals worldwide"
    }
  ];

  // Password requirements checklist
  const passwordRequirements = [
    { text: "At least 8 characters", met: signupData.password.length >= 8 },
    { text: "One uppercase letter", met: /[A-Z]/.test(signupData.password) },
    { text: "One lowercase letter", met: /[a-z]/.test(signupData.password) },
    { text: "One number", met: /\d/.test(signupData.password) },
    { text: "One special character (@$!%*?&)", met: /[@$!%*?&]/.test(signupData.password) },
  ];

  // Render social buttons view
  const renderSocialButtons = () => (
    <div className="space-y-4">
      <button
        onClick={handleGoogleAuth}
        disabled={loading}
        className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <img 
          src="https://www.google.com/favicon.ico" 
          alt="Google" 
          className="w-4 h-4 mr-3"
        />
        Continue with Google
      </button>

      <button
        onClick={() => setShowEmailForm(true)}
        disabled={loading}
        className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <Mail className="w-4 h-4 mr-3" />
        Continue with {activeTab === 'signin' ? 'email' : 'email'}
      </button>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-500 text-xs">Or</span>
        </div>
      </div>

      {/* Apple & Facebook Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {}}
          className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow text-sm"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.94 5.19A4.38 4.38 0 0 0 16 2a4.44 4.44 0 0 0-3 1.52 4.17 4.17 0 0 0-1 3.09 3.69 3.69 0 0 0 2.94-1.42zm2.52 7.44a4.51 4.51 0 0 1 2.16-3.81 4.66 4.66 0 0 0-3.66-2c-1.56-.16-3 .91-3.83.91s-2-.89-3.3-.87a4.92 4.92 0 0 0-4.14 2.53C2.93 12.45 4.24 17 6 19.47c.8 1.21 1.8 2.58 3.12 2.53s1.75-.76 3.28-.76 2 .76 3.3.73 2.22-1.24 3.06-2.45a11 11 0 0 0 1.38-2.85 4.41 4.41 0 0 1-2.68-4.04z"/>
          </svg>
          Apple
        </button>
        
        <button
          onClick={() => {}}
          className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow text-sm"
        >
          <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook
        </button>
      </div>
    </div>
  );

  // Render email form view
  const renderEmailForm = () => (
    <div>
      {/* Back Button */}
      <button
        onClick={() => setShowEmailForm(false)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
              placeholder="you@example.com"
              disabled={loading || loginMutation.isPending}
              autoFocus
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <button 
                type="button"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                onClick={() => {
                  onClose();
                  navigate('/forgot-password');
                }}
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm pr-10"
                placeholder="••••••••"
                disabled={loading || loginMutation.isPending}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || loginMutation.isPending}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loginMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing In...
              </>
            ) : (
              <>
                <LogIn className="mr-2" size={18} />
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
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={signupData.name}
              onChange={handleSignupChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
              placeholder="John Doe"
              disabled={loading || registerMutation.isPending}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={signupData.email}
              onChange={handleSignupChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
              placeholder="you@example.com"
              disabled={loading || registerMutation.isPending}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={signupData.password}
                onChange={handleSignupChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm pr-10"
                placeholder="••••••••"
                disabled={loading || registerMutation.isPending}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Password strength indicator */}
            {signupData.password && (
              <div className={`mt-2 p-2 rounded text-xs ${
                getPasswordStrengthColor() === 'green' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className="flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {passwordStrength}
                </div>
              </div>
            )}
            
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            )}
            
            {/* Password requirements checklist */}
            <div className="mt-3 space-y-1">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center text-xs">
                  <div className={`w-3 h-3 rounded-full mr-2 ${req.met ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || registerMutation.isPending}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {registerMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="mr-2" size={18} />
                Create Account
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex h-[500px]">
            {/* Left Side - Benefits */}
            <div className="hidden lg:flex flex-col w-2/5 bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-4">
                  Success starts here
                </h1>
                
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        {benefit.icon}
                      </div>
                      <div>
                        <h3 className="font-bold mb-1 text-sm">{benefit.title}</h3>
                        <p className="text-white/90 text-xs">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/20">
                <p className="text-white/80 text-xs">
                  Join millions of users who have found success on our platform
                </p>
              </div>
            </div>

            {/* Right Side - Auth Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-xs mx-auto h-full flex flex-col">
                {/* Header with tab switch - Only show in social view */}
                {!showEmailForm && (
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {activeTab === 'signin' ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {activeTab === 'signin' ? (
                        <>
                          Don't have an account?{" "}
                          <button
                            onClick={() => onSwitchTab('signup')}
                            className="text-emerald-600 hover:text-emerald-700 font-medium"
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
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <p className="text-center text-gray-600 text-xs">
                    By joining, you agree to the Vorkana Terms of Service and Privacy Policy.
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