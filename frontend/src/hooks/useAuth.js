// hooks/useAuth.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI, userAPI } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';

// Export validation functions
export { 
  validatePassword, 
  validateEmail, 
  validatePhoneNumber, 
  validateName 
} from '../api/auth';

// Extended validation functions
export const validateBio = (bio) => {
  if (bio && bio.length > 500) {
    return { valid: false, message: 'Bio cannot exceed 500 characters' };
  }
  return { valid: true, message: 'Bio is valid' };
};

export const validateDateOfBirth = (date) => {
  if (!date) return { valid: true, message: 'Date of birth is optional' };
  
  try {
    const dob = new Date(date);
    if (isNaN(dob.getTime())) {
      return { valid: false, message: 'Invalid date format' };
    }
    
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      const adjustedAge = age - 1;
      if (adjustedAge < 13) {
        return { valid: false, message: 'You must be at least 13 years old' };
      }
      if (adjustedAge > 120) {
        return { valid: false, message: 'Please enter a valid date of birth' };
      }
    } else {
      if (age < 13) {
        return { valid: false, message: 'You must be at least 13 years old' };
      }
      if (age > 120) {
        return { valid: false, message: 'Please enter a valid date of birth' };
      }
    }
    
    return { valid: true, message: 'Date of birth is valid' };
  } catch (error) {
    return { valid: false, message: 'Invalid date format' };
  }
};

// Custom error handler
const handleAuthError = (error, defaultMessage = 'Operation failed') => {
  let errorMessage = defaultMessage;
  let errorCode = null;
  
  if (error?.response?.data) {
    const backendData = error.response.data;
    errorMessage = backendData.message || errorMessage;
    errorCode = backendData.code;
    
    // Handle specific error codes
    switch (errorCode) {
      case 'ACCOUNT_LOCKED':
        errorMessage = 'Account is locked. Please try again later.';
        break;
      case 'PASSWORD_REUSE':
        errorMessage = 'Cannot reuse your last 3 passwords';
        break;
      case 'SESSION_EXPIRED':
        errorMessage = 'Session expired. Please login again.';
        break;
      case 'EMAIL_EXISTS':
        errorMessage = 'Email already exists. Please use a different email.';
        break;
      default:
        break;
    }
  } else if (error?.request) {
    errorMessage = 'Network error. Please check your connection.';
  }
  
  return { errorMessage, errorCode };
};
export const useCSRF = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  
  const getCSRFToken = useQuery({
    queryKey: ['csrfToken'],
    queryFn: async () => {
      try {
        console.log('Fetching CSRF token...');
        const response = await authAPI.getCSRFToken();
        if (response.success) {
          console.log('CSRF token fetched successfully');
          return response.csrfToken;
        }
        console.error('Failed to get CSRF token:', response.message);
        return null;
      } catch (error) {
        console.error('Error fetching CSRF token:', error.message);
        // Don't throw error, return null to allow retry
        return null;
      }
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
  
  const refreshCSRF = useMutation({
    mutationFn: authAPI.refreshCSRFToken,
    onSuccess: (data) => {
      if (data.success && data.csrfToken) {
        queryClient.setQueryData(['csrfToken'], data.csrfToken);
        toast.success('Security session refreshed');
      }
    },
    onError: (error) => {
      console.error('CSRF refresh error:', error);
      toast.error('Security session refresh failed');
    },
  });
  
  const validateCSRF = useCallback(async () => {
    try {
      const token = authAPI.getCSRFTokenValue();
      if (!token) {
        console.log('No CSRF token available');
        return false;
      }
      
      const expiry = localStorage.getItem('csrfTokenExpiry');
      const isValid = expiry && Date.now() < parseInt(expiry);
      
      console.log('CSRF validation:', { hasToken: !!token, isValid, expiry });
      return !!token && isValid;
    } catch (error) {
      console.error('CSRF validation error:', error);
      return false;
    }
  }, []);
  
  // Only set up periodic refresh if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      const expiry = localStorage.getItem('csrfTokenExpiry');
      if (!expiry || Date.now() > parseInt(expiry) - 5 * 60 * 1000) {
        console.log('Refreshing CSRF token due to expiry');
        refreshCSRF.mutate();
      }
    }, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshCSRF]);
  
  return {
    token: getCSRFToken.data,
    isLoading: getCSRFToken.isLoading,
    isError: getCSRFToken.isError,
    error: getCSRFToken.error,
    refetch: getCSRFToken.refetch,
    refresh: refreshCSRF.mutate,
    validate: validateCSRF,
    hasToken: !!getCSRFToken.data,
  };
};

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refetch: refetchCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async (userData) => {
      // Try to get CSRF token before login if not available
      const hasToken = authAPI.getCSRFTokenValue();
      if (!hasToken) {
        console.log('No CSRF token, attempting to get one before login...');
        try {
          await authAPI.getCSRFToken();
        } catch (error) {
          console.warn('Failed to get CSRF token before login, continuing anyway:', error.message);
        }
      }
      
      return authAPI.login(userData);
    },
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      if (data.success) {
        setAuth(data.user);
        queryClient.invalidateQueries(['userProfile']);
        queryClient.invalidateQueries(['checkAuth']);
        queryClient.invalidateQueries(['csrfToken']);
        
        // Refresh CSRF token after login
        refetchCSRF();
        
        toast.success(data.message || 'Welcome back!');
        
        setTimeout(() => navigate('/dashboard'), 500);
      } else {
        const errorMessage = data.message || 'Login failed';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Invalid credentials';
      setError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => setLoading(false),
  });
};

export const useRegister = () => {
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: authAPI.register,
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      if (data.success) {
        const message = data.message || 'Registration successful!';
        toast.success(message);
        
        if (data.requiresVerification) {
          navigate('/verify-email', {
            state: {
              email: data.user?.email,
              message: 'Please check your email to verify your account'
            }
          });
        } else {
          navigate('/dashboard');
        }
      } else {
        const errorMessage = data.message || 'Registration failed';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    },
    onError: (error) => {
      const { errorMessage } = handleAuthError(error, 'Registration failed');
      setError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => setLoading(false),
  });
};
export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authAPI.logout,
    onMutate: () => {
      // Show loading state
      toast.loading('Logging out...', {
        id: 'logout-toast',
        duration: 3000
      });
    },
    onSuccess: async (data) => {
      // 1. Clear React Query cache FIRST
      queryClient.clear();
      queryClient.removeQueries();
      
      // 2. Clear auth store
      logout();
      
      // 3. Clear ALL cookies from browser
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/admin;`;
        }
      });
      
      // 4. Clear ALL storage
      localStorage.clear();
      sessionStorage.clear();
      
      // 5. Force reload to clear any memory state
      setTimeout(() => {
        window.location.href = '/signin';
        window.location.reload();
      }, 500);
      
      toast.success('Logged out successfully', {
        id: 'logout-toast',
        duration: 2000
      });
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
      
      // Fallback cleanup on error
      localStorage.clear();
      sessionStorage.clear();
      logout();
      queryClient.clear();
      
      toast.success('Logged out (local session cleared)', {
        id: 'logout-toast',
        duration: 2000
      });
      
      setTimeout(() => {
        window.location.href = '/signin?logout=clean';
      }, 500);
    }
  });
};
export const clearAllCookies = () => {
  try {
    const cookies = document.cookie.split(';');
    
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      // Clear cookie with multiple paths
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/admin;';
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api;';
      
      // Clear domain cookies if applicable
      if (window.location.hostname.includes('localhost')) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;';
      }
    }
    
    console.log('✅ All cookies cleared');
    return true;
  } catch (error) {
    console.error('Error clearing cookies:', error);
    return false;
  }
};
export const useRefreshSession = () => {
  return useMutation({
    mutationFn: authAPI.refreshSession,
    onError: (error) => {
      const { errorMessage } = handleAuthError(error, 'Session refresh failed');
      console.error('Session refresh error:', errorMessage);
    },
  });
};

export const useCheckSessionStatus = () => {
  return useQuery({
    queryKey: ['sessionStatus'],
    queryFn: () => authAPI.checkSessionStatus(), // Add the queryFn
    staleTime: 30000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Profile hooks
export const useGetProfile = (options = {}) => {
  const setUser = useAuthStore((state) => state.setUser);
  
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        const response = await authAPI.getProfile();
        
        if (response.success && response.user) {
          if (response.user.picture) {
            const pictureUrl = new URL(response.user.picture, window.location.origin);
            pictureUrl.searchParams.set('t', Date.now());
            response.user.picture = pictureUrl.toString();
          }
          
          setUser(response.user);
        }
        
        return response;
      } catch (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
    },
    enabled: options.enabled !== false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useUpdateProfile = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const { refetch: refetchCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: authAPI.updateProfile,
    onMutate: () => {
      toast.loading('Updating profile...');
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user);
        queryClient.invalidateQueries(['userProfile']);
        queryClient.invalidateQueries(['publicProfile', data.user._id]);
        refetchCSRF();
        toast.success(data.message || 'Profile updated successfully');
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    },
    onError: (error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') {
        toast.error('Security validation failed. Please refresh the page.');
        refetchCSRF();
      } else {
        toast.error(error.message || 'Failed to update profile');
      }
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

// Updated useChangePassword hook
export const useChangePassword = () => {
  const navigate = useNavigate();
  const { refetch: refetchCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) => 
      authAPI.changePassword(currentPassword, newPassword),
    onMutate: () => {
      toast.loading('Changing password...');
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Password changed successfully');
        refetchCSRF();
        
        if (data.requiresReauth) {
          toast('Please login again with your new password', {
            icon: '🔒',
            duration: 3000
          });
          
          setTimeout(() => {
            navigate('/signin');
          }, 2000);
        }
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    },
    onError: (error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') {
        toast.error('Security validation failed. Please refresh the page.');
        refetchCSRF();
      } else {
        toast.error(error.message || 'Failed to change password');
      }
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};


// Email verification hooks
export const useVerifyEmail = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: authAPI.verifyEmail,
    onMutate: () => {
      toast.loading('Verifying email...');
    },
    onSuccess: (data) => {
      if (data.success) {
        if (data.user) {
          setUser(data.user);
        }
        
        toast.success(data.message || 'Email verified successfully');
        
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else if (data.alreadyVerified) {
          navigate('/dashboard');
        } else {
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      } else {
        toast.error(data.message || 'Email verification failed');
      }
    },
    onError: (error) => {
      const { errorMessage } = handleAuthError(error, 'Email verification failed');
      toast.error(errorMessage);
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: authAPI.resendVerification,
    onMutate: () => {
      toast.loading('Sending verification email...');
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Verification email sent');
      } else {
        toast.error(data.message || 'Failed to send verification email');
      }
    },
    onError: (error) => {
      const { errorMessage } = handleAuthError(error, 'Failed to send verification email');
      toast.error(errorMessage);
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useCheckVerificationStatus = (email) => {
  return useQuery({
    queryKey: ['verificationStatus', email],
    queryFn: () => authAPI.checkVerificationStatus(email),
    enabled: !!email,
    staleTime: 30000,
  });
};
export const useForgotPassword = () => {
  const { refetch: refetchCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: authAPI.forgotPassword,
    onMutate: () => {
      toast.loading('Sending reset email...');
    },
    onSuccess: (data) => {
      if (data.success) {
        refetchCSRF();
        toast.success(data.message || 'Password reset email sent. Please check your inbox.');
      } else {
        toast.error(data.message || 'Failed to send reset email');
      }
    },
    onError: (error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') {
        toast.error('Security validation failed. Please refresh the page.');
        refetchCSRF();
      } else {
        toast.error(error.message || 'Failed to send reset email');
      }
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

// Updated useResetPassword hook
export const useResetPassword = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const { refetch: refetchCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: ({ token, newPassword }) => 
      authAPI.resetPassword(token, newPassword),
    onMutate: () => {
      toast.loading('Resetting password...');
    },
    onSuccess: (data) => {
      if (data.success) {
        refetchCSRF();
        toast.success(data.message || 'Password reset successfully');
        
        if (data.user) {
          setAuth(data.user);
          navigate('/dashboard');
        } else {
          navigate('/signin');
        }
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    },
    onError: (error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') {
        toast.error('Security validation failed. Please refresh the page.');
        refetchCSRF();
      } else {
        toast.error(error.message || 'Failed to reset password');
      }
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

// Updated useDeactivateAccount hook
export const useDeactivateAccount = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { refetch: refetchCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: ({ password, reason }) => 
      authAPI.deactivateAccount(password, reason),
    onMutate: () => {
      toast.loading('Deactivating account...');
    },
    onSuccess: (data) => {
      if (data.success) {
        refetchCSRF();
        toast.success(data.message || 'Account deactivated successfully');
        
        if (data.reactivationDeadline) {
          const deadline = new Date(data.reactivationDeadline);
          const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
          toast(`You can reactivate within ${daysLeft} days`, {
            icon: '⏳',
            duration: 5000
          });
        }
        
        setTimeout(() => {
          logout();
          authAPI.clearAuthData();
          navigate('/');
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to deactivate account');
      }
    },
    onError: (error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') {
        toast.error('Security validation failed. Please refresh the page.');
        refetchCSRF();
      } else {
        toast.error(error.message || 'Failed to deactivate account');
      }
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

// Updated useReactivateAccount hook
export const useReactivateAccount = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const { refetch: refetchCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: ({ email, password }) => 
      authAPI.reactivateAccount(email, password),
    onMutate: () => {
      toast.loading('Reactivating account...');
    },
    onSuccess: (data) => {
      if (data.success) {
        setAuth(data.user);
        refetchCSRF();
        toast.success(data.message || 'Account reactivated successfully');
        navigate('/dashboard');
      } else {
        toast.error(data.message || 'Failed to reactivate account');
      }
    },
    onError: (error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') {
        toast.error('Security validation failed. Please refresh the page.');
        refetchCSRF();
      } else {
        toast.error(error.message || 'Failed to reactivate account');
      }
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

// CSRF Provider Component
export const CSRFProvider = ({ children }) => {
  const { token, isLoading, refetch } = useCSRF();
  const { isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    // Get CSRF token on mount if authenticated
    if (isAuthenticated && !token && !isLoading) {
      refetch();
    }
  }, [isAuthenticated, token, isLoading, refetch]);
  
  // Listen for CSRF errors
  useEffect(() => {
    const handleCSRFError = (event) => {
      if (event.detail?.code === 'CSRF_TOKEN_INVALID') {
        refetch();
        toast.error('Security session refreshed. Please try again.');
      }
    };
    
    window.addEventListener('csrf-error', handleCSRFError);
    
    return () => {
      window.removeEventListener('csrf-error', handleCSRFError);
    };
  }, [refetch]);
  
  // Check CSRF token periodically
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        const expiry = localStorage.getItem('csrfTokenExpiry');
        if (!expiry || Date.now() > parseInt(expiry) - 10 * 60 * 1000) {
          refetch();
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refetch]);
  
  return children;
};

// CSRF validation hook for forms
export const useCSRFValidation = () => {
  const { validate, hasToken } = useCSRF();
  const [isValid, setIsValid] = useState(false);
  
  const checkCSRF = useCallback(async () => {
    const valid = await validate();
    setIsValid(valid);
    return valid;
  }, [validate]);
  
  useEffect(() => {
    if (hasToken) {
      checkCSRF();
    }
  }, [hasToken, checkCSRF]);
  
  return {
    isValid,
    checkCSRF,
    hasToken
  };
};

// Sessions management hooks
export const useGetActiveSessions = () => {
  return useQuery({
    queryKey: ['activeSessions'],
    queryFn: authAPI.getActiveSessions,
    staleTime: 30000,
    retry: 1,
  });
};

export const useTerminateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authAPI.terminateSession,
    onSuccess: () => {
      queryClient.invalidateQueries(['activeSessions']);
      toast.success('Session terminated');
    },
    onError: (error) => {
      const { errorMessage } = handleAuthError(error, 'Failed to terminate session');
      toast.error(errorMessage);
    },
  });
};

export const useTerminateAllOtherSessions = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authAPI.terminateAllOtherSessions,
    onSuccess: () => {
      queryClient.invalidateQueries(['activeSessions']);
      toast.success('All other sessions terminated');
    },
    onError: (error) => {
      const { errorMessage } = handleAuthError(error, 'Failed to terminate sessions');
      toast.error(errorMessage);
    },
  });
};

// Public profile hooks
export const useGetPublicProfile = (userId) => {
  return useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => authAPI.getPublicProfile(userId),
    enabled: !!userId,
    staleTime: 60000,
    retry: 1,
  });
};

// Auth status hooks
export const useCheckAuth = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  
  return useQuery({
    queryKey: ['checkAuth'],
    queryFn: async () => {
      try {
        const response = await authAPI.checkAuth();
        
        if (response.success && response.isAuthenticated && response.user) {
          setAuth(response.user);
        }
        
        return response;
      } catch (error) {
        console.error('Auth check error:', error);
        return { success: false, isAuthenticated: false };
      }
    },
    staleTime: 30000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

// Profile form hook
export const useProfileForm = (initialData = {}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const updateProfile = useUpdateProfile();
  
  const validateField = useCallback((name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'name':
        const nameValidation = validateName(value);
        if (!nameValidation.valid) newErrors[name] = nameValidation.message;
        else delete newErrors[name];
        break;
        
      case 'email':
        if (value && !validateEmail(value)) {
          newErrors[name] = 'Please enter a valid email address';
        } else {
          delete newErrors[name];
        }
        break;
        
      case 'phoneNumber':
        if (value && !validatePhoneNumber(value)) {
          newErrors[name] = 'Please enter a valid phone number';
        } else {
          delete newErrors[name];
        }
        break;
        
      case 'bio':
        const bioValidation = validateBio(value);
        if (!bioValidation.valid) newErrors[name] = bioValidation.message;
        else delete newErrors[name];
        break;
        
      case 'dateOfBirth':
        const dobValidation = validateDateOfBirth(value);
        if (!dobValidation.valid) newErrors[name] = dobValidation.message;
        else delete newErrors[name];
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
    return !newErrors[name];
  }, [errors]);
  
  const handleChange = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      validateField(name, value);
    }
  }, [touched, validateField]);
  
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, formData[name]);
  }, [validateField, formData]);
  
  const validateForm = useCallback(() => {
    const newErrors = {};
    const fieldsToValidate = Object.keys(formData);
    
    fieldsToValidate.forEach(field => {
      if (!validateField(field, formData[field])) {
        newErrors[field] = errors[field];
      }
    });
    
    setErrors(newErrors);
    setTouched(Object.fromEntries(fieldsToValidate.map(f => [f, true])));
    
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField, errors]);
  
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return null;
    }
    
    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => 
        v !== undefined && v !== null && v !== ''
      )
    );
    
    try {
      const result = await updateProfile.mutateAsync(cleanData);
      return result;
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    }
  }, [validateForm, formData, updateProfile]);
  
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);
  
  return {
    formData,
    setFormData,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    isLoading: updateProfile.isPending,
    isSuccess: updateProfile.isSuccess,
    isError: updateProfile.isError,
  };
};

// Password strength hook
export const usePasswordStrength = (password) => {
  const [strength, setStrength] = useState({ score: 0, label: '', color: '' });
  
  useEffect(() => {
    if (!password) {
      setStrength({ score: 0, label: '', color: 'gray' });
      return;
    }
    
    let score = 0;
    const length = password.length;
    
    if (length >= 8) score += 20;
    if (length >= 12) score += 10;
    if (length >= 16) score += 10;
    
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/\d/.test(password)) score += 20;
    if (/[@$!%*?&]/.test(password)) score += 20;
    
    if (!/(.)\1{2,}/.test(password)) score += 10;
    
    score = Math.min(Math.max(score, 0), 100);
    
    let label, color;
    if (score >= 80) {
      label = 'Strong';
      color = 'green';
    } else if (score >= 60) {
      label = 'Good';
      color = 'blue';
    } else if (score >= 40) {
      label = 'Fair';
      color = 'yellow';
    } else {
      label = 'Weak';
      color = 'red';
    }
    
    setStrength({ score, label, color });
  }, [password]);
  
  return strength;
};
export const useSessionToast = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();

  const showSessionTimeoutToast = useCallback((message = 'Your session has timed out. Please login again.') => {
    toast.error(message, {
      duration: 5000,
      position: 'top-center',
      icon: '⏰',
      style: {
        background: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
      },
    });

    // Clear auth and redirect after toast
    setTimeout(() => {
      clearAuth();
      navigate('/signin?timeout=true');
    }, 2000);
  }, [navigate, clearAuth]);

  return { showSessionTimeoutToast };
};
export const useSessionWatcher = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const { showSessionTimeoutToast } = useSessionToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;

    let sessionCheckInterval;
    let activityListeners = [];

    const checkSessionStatus = async () => {
      try {
        const response = await authAPI.checkSessionStatus();
        
        if (!response.authenticated) {
          if (response.message?.includes('timeout')) {
            showSessionTimeoutToast('Session timed out due to 3 hours of inactivity');
          } else {
            logout();
            navigate('/signin?session=expired');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };

    // Reset activity timer on user interaction
    const resetActivityTimer = () => {
      // Clear existing interval
      if (sessionCheckInterval) clearInterval(sessionCheckInterval);
      
      // Set new interval
      sessionCheckInterval = setInterval(checkSessionStatus, 60000); // Check every minute
    };

    // Set up activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      const handler = () => resetActivityTimer();
      window.addEventListener(event, handler);
      activityListeners.push({ event, handler });
    });

    // Initial setup
    resetActivityTimer();

    // Cleanup
    return () => {
      if (sessionCheckInterval) clearInterval(sessionCheckInterval);
      activityListeners.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [isAuthenticated, logout, navigate, showSessionTimeoutToast]);

  return null;
};