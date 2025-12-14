import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI, userAPI } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

// Password validation helper
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!hasNumbers) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
  }
  
  return { valid: true, message: 'Password is strong' };
};

// Email validation helper
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  
  return useMutation({
    mutationFn: authAPI.login,
    onMutate: () => setLoading(true),
    onSuccess: (data) => {
      if (data.success) {
        setAuth(data.user, data.token);
        toast.success(data.message || 'Login successful!');
      } else {
        setError(data.message || 'Login failed');
        toast.error(data.message || 'Login failed');
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => setLoading(false),
  });
};

export const useRegister = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  
  return useMutation({
    mutationFn: authAPI.register,
    onMutate: () => setLoading(true),
    onSuccess: (data) => {
      if (data.success) {
        setAuth(data.user, data.token);
        toast.success(data.message || 'Registration successful!');
      } else {
        setError(data.message || 'Registration failed');
        toast.error(data.message || 'Registration failed');
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => setLoading(false),
  });
};

export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  
  return useMutation({
    mutationFn: authAPI.logout,
    onMutate: () => {
      toast.loading('Logging out...');
    },
    onSuccess: () => {
      logout();
      toast.success('Logged out successfully');
    },
    onError: (error) => {
      logout(); // Still logout on error
      toast.error(error.response?.data?.message || 'Logout failed');
    },
  });
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) => 
      authAPI.changePassword(currentPassword, newPassword),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Password changed successfully');
        
        // If requires reauth, logout user
        if (data.requiresReauth) {
          setTimeout(() => {
            window.location.href = '/signin';
          }, 2000);
        }
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });
};

export const useGetProfile = () => {
  const setUser = useAuthStore((state) => state.setUser);
  
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: authAPI.getProfile,
    enabled: !!useAuthStore.getState().token,
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user);
      }
    },
  });
};

export const useUpdateProfile = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authAPI.updateProfile,
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user);
        queryClient.invalidateQueries(['userProfile']);
        toast.success(data.message || 'Profile updated successfully');
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
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
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, newPassword }) => 
      authAPI.resetPassword(token, newPassword),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Password reset successfully');
        
        // Auto-login user if tokens provided
        if (data.token) {
          const { setAuth } = useAuthStore.getState();
          setAuth(data.user, data.token);
        }
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });
};