// import React, { useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { CheckCircle } from "lucide-react";
// import { useDispatch } from "react-redux";

// const OAuthSuccess = () => {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   useEffect(() => {
//     // Get data from URL
//     const urlParams = new URLSearchParams(window.location.search);
//     const encodedData = urlParams.get('data');
    
//     if (encodedData) {
//       try {
//         const data = JSON.parse(decodeURIComponent(encodedData));
        
//         if (data.token && data.user) {
//           // Store data in the format that authSlice expects
//           localStorage.setItem("userInfo", JSON.stringify(data.user));
//           localStorage.setItem("userToken", data.token);
          
//           // Dispatch an action to update Redux state
//           // You might need to create this action in your authSlice
//           // For now, we'll trigger a page reload to sync state
//           setTimeout(() => {
//             // Navigate to create-gig
//             navigate("/create-gig");
//             // Reload the page to sync auth state
//             window.location.reload();
//           }, 1000);
//         } else {
//           navigate("/login?error=invalid_data");
//         }
//       } catch (error) {
//         console.error("Error parsing OAuth data:", error);
//         navigate("/login?error=parse_error");
//       }
//     } else {
//       navigate("/login?error=no_data");
//     }
//   }, [navigate]);

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
//       <div className="text-center p-8 bg-white rounded-2xl shadow-2xl">
//         <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
//           <CheckCircle className="w-12 h-12 text-green-600" />
//         </div>
//         <h1 className="text-3xl font-bold text-gray-900 mb-4">
//           Successfully Logged In!
//         </h1>
//         <p className="text-gray-600 mb-8">
//           Redirecting you to create a gig...
//         </p>
//         <div className="w-24 h-1 bg-blue-600 rounded-full mx-auto animate-pulse"></div>
//       </div>
//     </div>
//   );
// };

// export default OAuthSuccess;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const handleOAuthCallback = () => {
      try {
        // Get data from URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');
        
        if (!dataParam) {
          throw new Error('No authentication data found');
        }
        
        // Decode and parse the data
        const data = JSON.parse(decodeURIComponent(dataParam));
        
        if (!data.token || !data.user) {
          throw new Error('Invalid authentication data');
        }
        
        // Set authentication state
        setAuth(data.user, data.token, data.refreshToken);
        
        setLoading(false);
        
        // Redirect based on user role
        setTimeout(() => {
          if (data.user.role === 'seller') {
            navigate('/seller/dashboard');
          } else {
            navigate('/');
          }
        }, 1500);
        
      } catch (err) {
        console.error('OAuth error:', err);
        setError(err.message || 'Authentication failed');
        setLoading(false);
        
        // Redirect to login after error
        setTimeout(() => {
          navigate('/signin');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [navigate, setAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full mx-4"
        >
          <div className="flex justify-center mb-6">
            <Loader className="w-12 h-12 text-emerald-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Completing Sign In</h2>
          <p className="text-gray-600 mb-6">Please wait while we set up your account...</p>
          <div className="space-y-2">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
              Verifying your account
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
              Setting up your profile
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-emerald-300 rounded-full mr-2"></div>
              Redirecting you...
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full mx-4"
        >
          <div className="flex justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Redirecting to login page...</p>
          <button
            onClick={() => navigate('/signin')}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full mx-4"
      >
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Successfully Signed In!</h2>
        <p className="text-gray-600 mb-6">You are now being redirected...</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5 }}
            className="bg-emerald-500 h-2 rounded-full"
          />
        </div>
        <p className="text-sm text-gray-500">Redirecting in a moment</p>
      </motion.div>
    </div>
  );
};

export default OAuthSuccess;