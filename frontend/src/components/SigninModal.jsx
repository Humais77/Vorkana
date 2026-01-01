import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Mail, Lock, LogIn, Globe, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import { useLogin } from "../hooks/useAuth.js";
import { useAuthStore } from "../store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

const SigninModal = ({ onClose, onSwitchToSignup }) => {
  const navigate = useNavigate();
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const loginMutation = useLogin();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    clearError();
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await loginMutation.mutateAsync(formData);
      toast.success("Successfully logged in!");
      onClose();
      navigate("/create-gig");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const redirectUrl = encodeURIComponent(`${window.location.origin}/oauth-success`);
    window.location.href = `${backendUrl}/api/auth/google?redirect=${redirectUrl}`;
  };

  // Handle Facebook login (you'll need to implement this)
  const handleFacebookLogin = () => {
    // Implement Facebook OAuth
    console.log("Facebook login");
  };

  // Handle Apple login (you'll need to implement this)
  const handleAppleLogin = () => {
    // Implement Apple OAuth
    console.log("Apple login");
  };

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
          className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex h-[600px]">
            {/* Left Side - Benefits */}
            <div className="hidden lg:flex flex-col w-2/5 bg-gradient-to-br from-emerald-500 to-teal-600 p-12 text-white">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-8">
                  Success starts here
                </h1>
                
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Over 700 categories</h3>
                      <p className="text-white/90">Find the perfect service for your needs</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Quality work done faster</h3>
                      <p className="text-white/90">Get professional results in no time</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Global talent access</h3>
                      <p className="text-white/90">Connect with professionals worldwide</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-8 border-t border-white/20">
                <p className="text-white/80 text-sm">
                  Join millions of users who have found success on our platform
                </p>
              </div>
            </div>

            {/* Right Side - Sign In Form */}
            <div className="flex-1 p-12 overflow-y-auto">
              <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Sign in to your account
                  </h2>
                  <p className="text-gray-600">
                    Don't have an account?{" "}
                    <button
                      onClick={onSwitchToSignup}
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Join here
                    </button>
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 font-medium">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Social Login Buttons */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading || loginMutation.isPending}
                    className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <img 
                      src="https://www.google.com/favicon.ico" 
                      alt="Google" 
                      className="w-5 h-5 mr-3"
                    />
                    Continue with Google
                  </button>

                  <button
                    onClick={() => {
                      // Handle email/username login - show email form
                      document.getElementById('email-form').scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={loading || loginMutation.isPending}
                    className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail className="w-5 h-5 mr-3" />
                    Continue with email/username
                  </button>

                  <div className="flex gap-4">
                    <button
                      onClick={handleAppleLogin}
                      className="flex-1 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14.94 5.19A4.38 4.38 0 0 0 16 2a4.44 4.44 0 0 0-3 1.52 4.17 4.17 0 0 0-1 3.09 3.69 3.69 0 0 0 2.94-1.42zm2.52 7.44a4.51 4.51 0 0 1 2.16-3.81 4.66 4.66 0 0 0-3.66-2c-1.56-.16-3 .91-3.83.91s-2-.89-3.3-.87a4.92 4.92 0 0 0-4.14 2.53C2.93 12.45 4.24 17 6 19.47c.8 1.21 1.8 2.58 3.12 2.53s1.75-.76 3.28-.76 2 .76 3.3.73 2.22-1.24 3.06-2.45a11 11 0 0 0 1.38-2.85 4.41 4.41 0 0 1-2.68-4.04z"/>
                      </svg>
                      Apple
                    </button>
                    
                    <button
                      onClick={handleFacebookLogin}
                      className="flex-1 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow"
                    >
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Or</span>
                    </div>
                  </div>

                  {/* Email Form */}
                  <div id="email-form">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="you@example.com"
                          disabled={loading || loginMutation.isPending}
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
                          >
                            Forgot password?
                          </button>
                        </div>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                          placeholder="••••••••"
                          disabled={loading || loginMutation.isPending}
                        />
                        {errors.password && (
                          <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading || loginMutation.isPending}
                        className="w-full py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loginMutation.isPending ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
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
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <p className="text-center text-gray-600 text-sm">
                      By joining, you agree to the Vorkanna Terms of Service and to occasionally receive emails from us.
                      {" "}
                      <button className="text-emerald-600 hover:text-emerald-700 font-medium">
                        Please read our Privacy Policy
                      </button>
                      {" "}to learn how we use your personal data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SigninModal;