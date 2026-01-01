import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI, userAPI, validatePassword, validateEmail, validatePhoneNumber } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Validation utilities
export { validatePassword, validateEmail, validatePhoneNumber };

// Extended validation functions
export const validateName = (name) => {
  if (!name || name.trim().length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters' };
  }
  if (name.trim().length > 50) {
    return { valid: false, message: 'Name cannot exceed 50 characters' };
  }
  return { valid: true, message: 'Name is valid' };
};

export const validateBio = (bio) => {
  if (bio && bio.length > 500) {
    return { valid: false, message: 'Bio cannot exceed 500 characters' };
  }
  return { valid: true, message: 'Bio is valid' };
};

export const validateDateOfBirth = (date) => {
  if (!date) return { valid: true, message: 'Date of birth is optional' };
  
  const dob = new Date(date);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  
  if (age < 13) {
    return { valid: false, message: 'You must be at least 13 years old' };
  }
  if (age > 120) {
    return { valid: false, message: 'Please enter a valid date of birth' };
  }
  return { valid: true, message: 'Date of birth is valid' };
};

// Authentication hooks
export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: authAPI.login,
    onMutate: () => {
      setLoading(true);
      setError(null); // Clear previous errors
    },
    onSuccess: (data) => {
      if (data.success) {
        setAuth(data.user, data.token, data.refreshToken);
        toast.success(data.message || 'Login successful!');
        
        if (data.requiresVerification) {
          toast('Please verify your email to access all features', { 
            icon: '📧',
            duration: 4000 
          });
          navigate('/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Show backend error message directly
        const errorMsg = data.message || 'Login failed';
        setError(errorMsg);
        toast.error(errorMsg);
        // DO NOT navigate here - stay on login page
      }
    },
    onError: (error) => {
  // Extract detailed error from backend
  let errorMessage = 'Login failed';
  
  if (error.response) {
    // The request was made and the server responded with a status code
    const backendError = error.response.data;
    
    // Check if this is the interceptor's "No refresh token" error
    if (error.message && error.message.includes('No refresh token available')) {
      // This is from the interceptor, not the backend
      // Try to get the original backend error
      if (backendError && backendError.message) {
        errorMessage = backendError.message;
      } else {
        errorMessage = 'Invalid email or password';
      }
    } else if (backendError && backendError.message) {
      // Show the actual backend error message
      errorMessage = backendError.message;
    } else if (backendError && backendError.errors && Array.isArray(backendError.errors)) {
      // Handle validation errors array
      errorMessage = backendError.errors.join(', ');
    } else if (typeof backendError === 'string') {
      errorMessage = backendError;
    }
    
    // Handle specific HTTP status codes
    if (error.response.status === 401) {
      // Make sure we show the actual backend message, not the interceptor message
      if (!errorMessage.includes('Invalid') && !errorMessage.includes('invalid')) {
        errorMessage = errorMessage || 'Invalid email or password';
      }
    } else if (error.response.status === 429) {
      errorMessage = errorMessage || 'Too many attempts. Please try again later.';
    } else if (error.response.status === 423) {
      errorMessage = errorMessage || 'Account is locked. Please try again later.';
    } else if (error.response.status === 403) {
      errorMessage = errorMessage || 'Account is deactivated. Please contact support.';
    }
  } else if (error.request) {
    // The request was made but no response was received
    errorMessage = 'Network error. Please check your connection.';
  } else {
    // Something happened in setting up the request
    // Filter out interceptor-specific messages
    if (error.message && error.message.includes('No refresh token')) {
      errorMessage = 'Invalid email or password';
    } else {
      errorMessage = error.message || 'Login failed';
    }
  }
  
  setError(errorMessage);
  toast.error(errorMessage);
  
  // Log detailed error for debugging (remove in production)
  console.error('Login error details:', {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status,
    config: error.config?.url
  });
},
    onSettled: () => setLoading(false),
  });
};

// Update the useRegister hook as well
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
        toast.success(data.message || 'Registration initiated!');
        // Redirect to verification page with email
        navigate('/verify-email', { 
          state: { 
            email: data.user?.email,
            message: 'Please check your email to verify your account' 
          }
        });
      } else {
        const errorMsg = data.message || 'Registration failed';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    },
    onError: (error) => {
      let errorMessage = 'Registration failed';
      
      if (error.response) {
        const backendError = error.response.data;
        
        if (backendError.message) {
          errorMessage = backendError.message;
        } else if (backendError.errors && Array.isArray(backendError.errors)) {
          errorMessage = backendError.errors.join(', ');
        }
        
        if (error.response.status === 409) {
          errorMessage = errorMessage || 'Email already exists. Please use a different email.';
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => setLoading(false),
  });
};

export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: authAPI.logout,
    onMutate: () => {
      toast.loading('Logging out...');
    },
    onSuccess: () => {
      logout();
      toast.success('Logged out successfully');
      navigate('/');
    },
    onError: (error) => {
      // Still logout even if API call fails
      logout();
      toast.error('Logged out locally');
      navigate('/');
    },
  });
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) => 
      authAPI.changePassword(currentPassword, newPassword),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Password changed successfully');
        
        if (data.requiresReauth) {
          toast('Please login again with your new password', { 
            icon: '🔒',
            duration: 3000 
          });
          
          // Logout and redirect after delay
          setTimeout(() => {
            logout();
            navigate('/signin');
          }, 2000);
        }
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'PASSWORD_REUSE') {
        toast.error('Cannot reuse your last 3 passwords');
      } else if (errorCode === 'PASSWORD_CHANGE_RATE_LIMIT') {
        toast.error('You can only change your password once per hour');
      } else {
        toast.error(errorMessage);
      }
    },
  });
};

// In useAuth.js - Update the useGetProfile hook
export const useGetProfile = (options = {}) => {
  const setUser = useAuthStore((state) => state.setUser);
  const token = useAuthStore((state) => state.token);
  
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        const response = await authAPI.getProfile();
        if (response.success && response.user) {
          // Add cache busting to picture URL
          if (response.user.picture) {
            response.user.picture = `${response.user.picture.split('?')[0]}?t=${Date.now()}`;
          }
          setUser(response.user);
        }
        return response;
      } catch (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
    },
    enabled: !!token && !options.skip, // Skip if requested
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60 * 2, // 2 minutes - shorter for fresh data
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true, // Refresh when tab becomes active
    refetchOnMount: options.refetchOnMount !== false, // Refetch on mount by default
    refetchOnReconnect: true,
    onError: (error) => {
      if (error.response?.status === 401) {
        useAuthStore.getState().logout();
      }
    },
    ...options, // Allow overriding default options
  });
};
// In useAuth.js - improve the useUpdateProfile hook
export const useUpdateProfile = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userData) => {
      console.log('Sending update data:', userData);
      
      // Make sure we're sending proper JSON
      const response = await authAPI.updateProfile(userData);
      console.log('Update response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Update success:', data);
      if (data.success && data.user) {
        setUser(data.user);
        queryClient.invalidateQueries(['userProfile']);
        queryClient.invalidateQueries(['userProfile', data.user._id]);
      }
    },
    onError: (error) => {
      console.error('Update mutation error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
  });
};

export const useSwitchRole = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (role) => userAPI.switchRole(role),
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user);
        queryClient.invalidateQueries(['userProfile']);
        toast.success(data.message || 'Role switched successfully');
      } else {
        toast.error(data.message || 'Failed to switch role');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to switch role');
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: authAPI.forgotPassword,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Password reset email sent');
      } else {
        toast.error(data.message || 'Failed to send reset email');
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to send reset email';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'RESET_RATE_LIMIT') {
        toast.error('Too many reset attempts. Please try again tomorrow.');
      } else {
        toast.error(errorMessage);
      }
    },
  });
};

export const useResetPassword = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: ({ token, newPassword }) => 
      authAPI.resetPassword(token, newPassword),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Password reset successfully');
        
        if (data.token && data.user) {
          setAuth(data.user, data.token, data.refreshToken);
          navigate('/dashboard');
        } else {
          navigate('/signin');
        }
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to reset password';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'PASSWORD_REUSE') {
        toast.error('Cannot reuse your last 3 passwords');
      } else if (error.response?.status === 400 && error.response.data.message.includes('expired')) {
        toast.error('Reset link has expired. Please request a new one.');
      } else {
        toast.error(errorMessage);
      }
    },
  });
};

export const useVerifyEmail = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: authAPI.verifyEmail,
    onSuccess: (data) => {
      if (data.success) {
        if (data.token) {
          setAuth(data.user, data.token, data.refreshToken);
        }
        toast.success(data.message || 'Email verified successfully');
        
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          navigate('/dashboard');
        }
      } else {
        toast.error(data.message || 'Email verification failed');
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Email verification failed';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'INVALID_TOKEN') {
        toast.error('Invalid verification link. Please request a new one.');
      } else if (errorCode === 'ALREADY_VERIFIED') {
        toast.success('Email is already verified');
        navigate('/dashboard');
      } else {
        toast.error(errorMessage);
      }
    },
  });
};
// hooks/useAuth.js - Add this hook
export const useCheckResetToken = () => {
  return useMutation({
    mutationFn: async (token) => {
      const response = await axiosInstance.get(`/api/auth/validate-reset-token/${token}`);
      return response.data;
    },
    onError: (error) => {
      console.error('Token validation error:', error);
    },
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: authAPI.resendVerification,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Verification email sent');
      } else {
        toast.error(data.message || 'Failed to send verification email');
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to send verification email';
      
      if (error.response?.status === 429) {
        const retryAfter = error.response?.data?.retryAfter;
        const message = retryAfter 
          ? `Please wait ${Math.ceil(retryAfter / 60)} minutes before requesting another email`
          : errorMessage;
        toast.error(message);
      } else {
        toast.error(errorMessage);
      }
    },
  });
};

export const useDeactivateAccount = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: ({ password, reason }) => 
      authAPI.deactivateAccount(password, reason),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Account deactivated successfully');
        
        // Show reactivation deadline
        if (data.reactivationDeadline) {
          const deadline = new Date(data.reactivationDeadline);
          const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
          toast(`You can reactivate within ${daysLeft} days`, { 
            icon: '⏳',
            duration: 5000 
          });
        }
        
        // Logout and redirect
        setTimeout(() => {
          logout();
          navigate('/');
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to deactivate account');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate account');
    },
  });
};

export const useReactivateAccount = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: ({ email, password }) => 
      authAPI.reactivateAccount(email, password),
    onSuccess: (data) => {
      if (data.success) {
        setAuth(data.user, data.token, data.refreshToken);
        toast.success(data.message || 'Account reactivated successfully');
        navigate('/dashboard');
      } else {
        toast.error(data.message || 'Failed to reactivate account');
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to reactivate account';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'ACCOUNT_PERMANENTLY_DELETED') {
        toast.error('Account cannot be reactivated. Please create a new account.');
      } else {
        toast.error(errorMessage);
      }
    },
  });
};

export const useGetPublicProfile = (userId) => {
  return useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => authAPI.getPublicProfile(userId),
    enabled: !!userId,
    retry: 1,
  });
};

// Custom hook for managing profile form
export const useProfileForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const updateProfile = useUpdateProfile();
  
  const validateField = (name, value) => {
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
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };
  
  const handleSubmit = async () => {
    // Validate all fields
    const isValid = Object.entries(formData).every(([name, value]) => 
      validateField(name, value)
    );
    
    if (!isValid) {
      toast.error('Please fix validation errors');
      return;
    }
    
    return updateProfile.mutateAsync(formData);
  };
  
  return {
    formData,
    setFormData,
    errors,
    handleChange,
    handleSubmit,
    isLoading: updateProfile.isPending
  };
};