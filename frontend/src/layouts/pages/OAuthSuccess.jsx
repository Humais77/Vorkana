// OAuthSuccess.jsx - Updated for cookie-based auth
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { authAPI } from '../../api/auth';
import { toast } from 'react-hot-toast';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      console.log('Processing OAuth callback...');
      
      try {
        // Check session status to get user info (cookies are already set)
        const response = await authAPI.getSessionStatus();
        
        if (response.success && response.authenticated && response.user) {
          console.log('OAuth success, user authenticated:', response.user.email);
          
          // Set auth state with user info
          setAuth(response.user);
          
          toast.success('Successfully logged in with Google!');
          
          // Redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        } else {
          console.error('OAuth failed - no authenticated user');
          toast.error('OAuth authentication failed');
          navigate('/signin');
        }
      } catch (error) {
        console.error('Error processing OAuth:', error);
        
        // If we have an error but maybe cookies are still set, try getting profile
        try {
          const profileResponse = await authAPI.getProfile();
          if (profileResponse.success && profileResponse.user) {
            setAuth(profileResponse.user);
            toast.success('Successfully logged in with Google!');
            navigate('/dashboard');
            return;
          }
        } catch (profileError) {
          console.error('Failed to get profile too:', profileError);
        }
        
        toast.error('Failed to complete OAuth login');
        navigate('/signin');
      }
    };

    handleOAuthSuccess();
  }, [navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing Google login...</p>
        <p className="mt-2 text-sm text-gray-500">
          Please wait while we set up your session
        </p>
      </div>
    </div>
  );
};

export default OAuthSuccess;