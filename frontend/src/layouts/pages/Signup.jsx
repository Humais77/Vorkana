// layouts/pages/Signup.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Mail, Lock, UserPlus, Eye, EyeOff, User, 
  ArrowLeft, AlertCircle 
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  useRegister, 
  validatePassword,
  validateEmail,
  validateName
} from "../../hooks/useAuth";
import { useAuthStore } from "../../store/useAuthStore";
import { motion } from "framer-motion";
import auth_modal_bg from '../../assets/auth_modal_bg.png';
import { FaCheck } from 'react-icons/fa';
import { SeoWrapper } from "../../components/SeoWrapper";

// Structured Data
const signupStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Sign Up for Vorkanna | Create Your Account",
  "description": "Create your Vorkanna account today. Join our global marketplace with over 100 service categories. Connect with talent and businesses worldwide.",
  "url": typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup',
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": typeof window !== 'undefined' ? `${window.location.origin}` : '/'
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Sign Up",
        "item": typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup'
      }
    ]
  },
  "potentialAction": {
    "@type": "CreateAction",
    "name": "Create Account",
    "description": "Create a new Vorkanna account to start offering or finding services"
  }
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Vorkanna",
  "url": typeof window !== 'undefined' ? window.location.origin : '/',
  "logo": `${window.location.origin}/logo.png`,
  "description": "Global marketplace connecting talent with businesses across 100+ service categories"
};

const Signup = () => {
  const navigate = useNavigate();
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const registerMutation = useRegister();

  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
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
      newErrors.email = "Email is required";
    } else if (!validateEmail(signupData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    const passwordValidation = validatePassword(signupData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;

    setIsSubmitting(true);
    try {
      const registrationData = {
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
      };

      await registerMutation.mutateAsync(registrationData);
      toast.success("Registration successful! Please check your email to verify your account.");
      navigate("/verify-email");
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getPasswordStrengthColor = () => {
    if (!signupData.password) return 'gray';
    const validation = validatePassword(signupData.password);
    return validation.valid ? 'green' : 'red';
  };

  const benefits = [
    { title: "Over 100 categories" },
    { title: "Quality work done faster" },
    { title: "Access to talent and businesses across the globe" }
  ];

  const passwordRequirements = [
    { text: "At least 8 characters", met: signupData.password.length >= 8 },
    { text: "One uppercase letter", met: /[A-Z]/.test(signupData.password) },
    { text: "One lowercase letter", met: /[a-z]/.test(signupData.password) },
    { text: "One number", met: /\d/.test(signupData.password) },
    { text: "One special character (@$!%*?&)", met: /[@$!%*?&]/.test(signupData.password) },
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

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-base">
          <span className="px-4 bg-white text-gray-500 text-sm">Or</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => { }}
          disabled={loading || isSubmitting}
          className="flex-1 py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow text-base disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Continue with Apple"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M14.94 5.19A4.38 4.38 0 0 0 16 2a4.44 4.44 0 0 0-3 1.52 4.17 4.17 0 0 0-1 3.09 3.69 3.69 0 0 0 2.94-1.42zm2.52 7.44a4.51 4.51 0 0 1 2.16-3.81 4.66 4.66 0 0 0-3.66-2c-1.56-.16-3 .91-3.83.91s-2-.89-3.3-.87a4.92 4.92 0 0 0-4.14 2.53C2.93 12.45 4.24 17 6 19.47c.8 1.21 1.8 2.58 3.12 2.53s1.75-.76 3.28-.76 2 .76 3.3.73 2.22-1.24 3.06-2.45a11 11 0 0 0 1.38-2.85 4.41 4.41 0 0 1-2.68-4.04z" />
          </svg>
          Apple
        </button>

        <button
          onClick={() => { }}
          disabled={loading || isSubmitting}
          className="flex-1 py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow text-base disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Continue with Facebook"
        >
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Continue with your email
        </h2>
        <p className="text-gray-600 text-sm">
          Create your account to access our global marketplace
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <p className="text-red-600 font-medium text-sm">{error}</p>
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
            className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base"
            placeholder="John Doe"
            disabled={loading || registerMutation.isPending || isSubmitting}
            autoFocus
            required
            aria-required="true"
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-2 text-sm text-red-600" role="alert">{errors.name}</p>
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
            className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base"
            placeholder="you@example.com"
            disabled={loading || registerMutation.isPending || isSubmitting}
            required
            aria-required="true"
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-semibold text-gray-700 mb-2 block">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={signupData.password}
              onChange={handleSignupChange}
              className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base pr-12"
              placeholder="••••••••"
              disabled={loading || registerMutation.isPending || isSubmitting}
              required
              aria-required="true"
              aria-describedby={errors.password ? "password-error" : "password-help"}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isSubmitting}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>

          {signupData.password && (
            <div 
              className={`mt-3 p-3 rounded text-sm ${getPasswordStrengthColor() === 'green'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                <span id="password-strength">{passwordStrength}</span>
              </div>
            </div>
          )}

          {errors.password && (
            <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">{errors.password}</p>
          )}

          <div className="mt-4 space-y-2" id="password-help" aria-label="Password requirements">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center text-sm">
                <div 
                  className={`w-3.5 h-3.5 rounded-full mr-2.5 ${req.met ? 'bg-green-500' : 'bg-gray-300'}`}
                  aria-hidden="true"
                />
                <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start mt-6">
          <input
            type="checkbox"
            id="terms"
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
            required
            aria-required="true"
          />
          <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
            I agree to the{" "}
            <Link to="/terms" className="text-emerald-600 hover:text-emerald-700">
              Vorkanna Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-emerald-600 hover:text-emerald-700">
              Privacy Policy
            </Link>. I understand that I will receive account-related emails.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || registerMutation.isPending || isSubmitting}
          className="w-full py-3.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-base mt-4"
          aria-label={isSubmitting ? "Creating account..." : "Create your Vorkanna account"}
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

        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account?{' '}
          <Link
            to="/signin"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
            aria-label="Sign in to your existing account"
          >
            Sign in here
          </Link>
        </p>
      </form>
    </div>
  );

  return (
    <>
      {/* Add organization structured data */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
      />
      
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
                  <h1 className="text-3xl font-bold mt-2 mb-4">
                    Success starts here
                  </h1>

                  <ul className="space-y-3">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <FaCheck className="mt-0.5 text-white text-sm" aria-hidden="true" />
                        <h3 className="font-semibold text-base leading-tight">
                          {benefit.title}
                        </h3>
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
                      <h1 className="text-3xl font-bold text-gray-900 mb-3">
                        Create a new account
                      </h1>
                      <p className="text-gray-600 text-base">
                        Already have an account?{" "}
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
                      By joining, you agree to the{" "}
                      <Link to="/terms" className="text-emerald-600 hover:text-emerald-700">
                        Vorkanna Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-emerald-600 hover:text-emerald-700">
                        Privacy Policy
                      </Link>.
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
    </>
  );
};

export default Signup;