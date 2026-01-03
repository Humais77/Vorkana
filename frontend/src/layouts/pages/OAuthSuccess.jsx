import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'react-hot-toast';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const processOAuth = async () => {
      try {
        console.log("Processing OAuth callback...");
        
        // Parse query parameters
        const params = new URLSearchParams(location.search);
        const dataParam = params.get('data');
        const error = params.get('error');
        
        if (error) {
          toast.error(`OAuth failed: ${error}`);
          navigate('/sign-in');
          return;
        }
        
        if (!dataParam) {
          console.error("No data parameter in OAuth callback");
          toast.error('Missing authentication data');
          navigate('/sign-in');
          return;
        }
        
        // Parse the user data
        const userData = JSON.parse(decodeURIComponent(dataParam));
        
        console.log("OAuth user data received:", {
          token: userData.token ? userData.token.substring(0, 20) + '...' : 'No token',
          userId: userData.user?._id,
          email: userData.user?.email
        });
        
        if (!userData.token || !userData.refreshToken || !userData.user) {
          throw new Error('Invalid authentication data');
        }
        
        // Store tokens and user info
        localStorage.setItem('userToken', userData.token);
        localStorage.setItem('refreshToken', userData.refreshToken);
        localStorage.setItem('userInfo', JSON.stringify(userData.user));
        
        // Update auth store
        setAuth(userData.user, userData.token, userData.refreshToken);
        
        toast.success('Successfully signed in with Google!');
        navigate('/dashboard');
        
      } catch (error) {
        console.error('OAuth processing error:', error);
        toast.error('Failed to complete OAuth login. Please try again.');
        navigate('/sign-in');
      }
    };

    processOAuth();
  }, [location, navigate, setAuth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Completing Login...
        </h2>
        <p className="text-gray-600">
          Please wait while we finish setting up your account.
        </p>
      </div>
    </div>
  );
};

export default OAuthSuccess;