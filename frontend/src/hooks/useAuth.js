import { useMutation } from '@tanstack/react-query';
import { authAPI } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';
import { useState } from 'react';

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  
  return useMutation({
    mutationFn: authAPI.login,
    onMutate: () => setLoading(true),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Login failed');
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
      setAuth(data.user, data.token);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Registration failed');
    },
    onSettled: () => setLoading(false),
  });
};

// Better implementation with proper mutation state
export const useLogout = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const logout = useAuthStore((state) => state.logout);
  
  const mutateAsync = async () => {
    try {
      setIsPending(true);
      setError(null);
      // Simulate API call if needed
      await new Promise(resolve => setTimeout(resolve, 500));
      logout();
      return { success: true };
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };
  
  return {
    mutateAsync,
    mutate: mutateAsync,
    isPending,
    isError: !!error,
    error,
    isSuccess: !isPending && !error,
  };
};