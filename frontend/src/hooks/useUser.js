// hooks/useUser.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { usersAPI } from '../api/users';
import toast from 'react-hot-toast';

export const useSwitchRole = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: async (newRole) => {
      if (!['user', 'seller'].includes(newRole)) {
        throw new Error('Invalid role');
      }
      
      const response = await usersAPI.switchRole(newRole);
      return response;
    },
    onSuccess: (data) => {
      // Update the user and token in the auth store
      if (data.user && data.token) {
        // If we have both user and token, use setAuth
        setAuth(data.user, data.token);
      } else if (data.user) {
        // If we only have updated user info, use setUser
        setUser(data.user);
      } else if (data.token) {
        // If we only have new token, use setToken
        setToken(data.token);
      }
      
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      const message = data.user?.role === 'seller' 
        ? 'Switched to Seller Mode. You can now create services!'
        : 'Switched to User Mode';
      
      toast.success(message);
    },
    onError: (error) => {
      console.error('Role switch error:', error);
      toast.error(error.data?.message || error.message || 'Failed to switch role');
    },
  });
};