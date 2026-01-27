// layouts/pages/OAuthSuccess.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { authAPI } from '../../api/auth';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      console.log('🔄 Processing OAuth callback...');
      
      try {
        // Option 1: Check if user is already authenticated via cookies
        console.log('🔍 Checking auth status...');
        const authResponse = await authAPI.checkAuth();
        
        if (authResponse.success && authResponse.isAuthenticated && authResponse.user) {
          console.log('✅ OAuth successful, user authenticated:', authResponse.user.email);
          
          // Update auth store with user data
          setAuth(authResponse.user);
          
          toast.success('Successfully logged in with Google!');
          
          // Redirect after short delay
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1000);
          return;
        }
        
        // Option 2: Try to get user profile directly
        console.log('🔄 Trying to get user profile...');
        try {
          const profileResponse = await authAPI.getProfile();
          if (profileResponse.success && profileResponse.user) {
            console.log('✅ Got user profile:', profileResponse.user.email);
            setAuth(profileResponse.user);
            toast.success('Successfully logged in with Google!');
            setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
            return;
          }
        } catch (profileError) {
          console.warn('Could not get profile:', profileError.message);
        }
        
        // Option 3: Force sync from storage
        console.log('🔄 Syncing from storage...');
        syncFromStorage();
        
        // Check local storage
        const userFromStorage = localStorage.getItem('vorkanna_user_v1');
        if (userFromStorage) {
          try {
            const user = JSON.parse(userFromStorage);
            console.log('✅ Found user in storage:', user.email);
            setAuth(user);
            toast.success('Successfully logged in with Google!');
            setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
            return;
          } catch (e) {
            console.error('Error parsing user from storage:', e);
          }
        }
        
        // If all fails, redirect to signin
        console.error('❌ OAuth failed - no authenticated user found');
        toast.error('Login failed. Please try again.');
        setTimeout(() => navigate('/signin', { replace: true }), 1500);
        
      } catch (error) {
        console.error('❌ Error processing OAuth:', error);
        toast.error('Login failed. Please try again.');
        setTimeout(() => navigate('/signin', { replace: true }), 1500);
      }
    };

    // Add a small delay to ensure cookies are set
    const timer = setTimeout(() => {
      handleOAuthSuccess();
    }, 500);

    return () => clearTimeout(timer);
  }, [navigate, setAuth, syncFromStorage]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-800">Completing Google Login</h2>
            <p className="text-gray-600">
              Setting up your account and preparing your dashboard...
            </p>
            <div className="pt-4">
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthSuccess;