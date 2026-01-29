// layouts/pages/OAuthSuccess.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { authAPI } from '../../api/auth';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const { setAuth, syncFromStorage } = useAuthStore();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processOAuth = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');

        // Step 1: Try to extract data from URL fragment (fastest)
        const hash = window.location.hash.substring(1);
        if (hash && hash.includes('data=')) {
          try {
            const dataStr = hash.split('data=')[1];
            const data = JSON.parse(decodeURIComponent(dataStr));
            
            if (data.success && data.user) {
              console.log('🚀 Fast OAuth: Data from URL fragment', data.user.email);
              
              // Clear the hash from URL
              window.history.replaceState(null, '', window.location.pathname);
              
              // Update auth store
              setAuth(data.user);
              
              // Force sync after state update
              setTimeout(() => {
                syncFromStorage();
                
                // Dispatch event for navbar update
                window.dispatchEvent(new CustomEvent('authStateChanged', {
                  detail: { user: data.user }
                }));
                
                setStatus('success');
                
                // Navigate after short delay
                setTimeout(() => {
                  navigate('/dashboard', { replace: true });
                }, 500);
              }, 100);
              
              return;
            }
          } catch (e) {
            console.warn('Failed to parse URL fragment:', e);
            // Continue with other methods
          }
        }

        setStatus('checking');

        // Step 2: Check auth with backend API
        try {
          console.log('🔄 Checking authentication status...');
          const authCheck = await authAPI.checkAuth();
          
          if (authCheck.success && authCheck.isAuthenticated && authCheck.user) {
            console.log('✅ User authenticated via API:', authCheck.user.email);
            
            setAuth(authCheck.user);
            syncFromStorage();
            
            window.dispatchEvent(new CustomEvent('authStateChanged', {
              detail: { user: authCheck.user }
            }));
            
            setStatus('success');
            
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 500);
            
            return;
          }
        } catch (apiError) {
          console.warn('API check failed:', apiError.message);
        }

        setStatus('fallback');

        // Step 3: Fallback to localStorage check
        console.log('🔄 Checking localStorage as fallback...');
        const localStorageKeys = Object.keys(localStorage);
        const userKeys = localStorageKeys.filter(key => 
          key.includes('user') || key.includes('vorkanna') || key.includes('auth')
        );

        for (const key of userKeys) {
          try {
            const rawData = localStorage.getItem(key);
            if (!rawData) continue;

            const parsed = JSON.parse(rawData);
            let userData = null;

            // Extract user from various storage formats
            if (parsed.user) userData = parsed.user;
            else if (parsed.state?.user) userData = parsed.state.user;
            else if (parsed._id && parsed.email) userData = parsed;

            if (userData && userData.email) {
              console.log(`✅ Found user in ${key}:`, userData.email);
              
              setAuth(userData);
              syncFromStorage();
              
              window.dispatchEvent(new CustomEvent('authStateChanged'));
              
              setStatus('success');
              
              setTimeout(() => {
                navigate('/dashboard', { replace: true });
              }, 500);
              
              return;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }

        // Step 4: Last resort - redirect to dashboard
        console.log('⚠️ No user data found, redirecting to dashboard...');
        setStatus('redirecting');
        setError('Redirecting to dashboard...');
        
        // Force hard redirect after delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);

      } catch (error) {
        console.error('OAuth processing error:', error);
        setStatus('error');
        setError('Failed to process OAuth login. Please try again.');
        
        setTimeout(() => {
          navigate('/signin', { replace: true });
        }, 2000);
      }
    };

    processOAuth();

    // Cleanup
    return () => {
      // Mark as processed on unmount
      hasProcessed.current = true;
    };
  }, [navigate, setAuth, syncFromStorage]);

  const renderStatus = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-800">
              Processing OAuth login...
            </h2>
            <p className="text-gray-600 text-sm">
              Please wait while we set up your session
            </p>
          </div>
        );
      
      case 'checking':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-800">
              Verifying authentication...
            </h2>
            <p className="text-gray-600 text-sm">
              Checking your login credentials
            </p>
          </div>
        );
      
      case 'fallback':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-yellow-600 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-800">
              Finalizing login...
            </h2>
            <p className="text-gray-600 text-sm">
              Almost there!
            </p>
          </div>
        );
      
      case 'success':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 animate-pulse" />
            <h2 className="text-xl font-semibold text-gray-800">
              Login successful!
            </h2>
            <p className="text-gray-600 text-sm">
              Redirecting to dashboard...
            </p>
          </div>
        );
      
      case 'redirecting':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-800">
              Redirecting...
            </h2>
            <p className="text-gray-600 text-sm">
              {error || 'Please wait'}
            </p>
          </div>
        );
      
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Login failed
            </h2>
            <p className="text-gray-600 text-sm text-center">
              {error || 'An error occurred during login'}
            </p>
            <button
              onClick={() => navigate('/signin')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        );
      
      default:
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-800">
              Please wait...
            </h2>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
        {renderStatus()}
      </div>
    </div>
  );
};

export default OAuthSuccess;