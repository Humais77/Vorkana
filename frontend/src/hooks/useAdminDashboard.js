import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../api/admin.js';
import { useAdminStore } from '../store/useAdminStore.js';
import { toast } from 'react-hot-toast';

export const useAdminDashboard = () => {
  const queryClient = useQueryClient();
  const { setDashboardStats } = useAdminStore();

  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      try {
        const response = await adminAPI.getDashboardStats();
        
        if (response.data.success) {
          const stats = response.data.data;
          
          // Store in Zustand
          setDashboardStats({
            totalUsers: stats.overview?.totalUsers || 0,
            totalCategories: stats.categories?.totalCategories || 0,
            totalServices: stats.services?.totalServices || 0,
            totalGigs: stats.gigs?.totalGigs || 0,
            activeUsers: stats.overview?.activeUsers || 0,
            activeCategories: stats.categories?.activeCategories || 0,
            activeServices: stats.services?.activeServices || 0,
            activeGigs: stats.gigs?.activeGigs || 0
          });
          
          return stats;
        }
        
        throw new Error(response.data.message || 'Failed to fetch dashboard stats');
      } catch (error) {
        console.error('Dashboard error:', error);
        // Return empty stats instead of fake data
        const emptyStats = {
          overview: {
            totalUsers: 0,
            activeUsers: 0
          },
          categories: {
            totalCategories: 0,
            activeCategories: 0
          },
          services: {
            totalServices: 0,
            activeServices: 0
          },
          gigs: {
            totalGigs: 0,
            activeGigs: 0
          }
        };
        
        setDashboardStats({
          totalUsers: 0,
          totalCategories: 0,
          totalServices: 0,
          totalGigs: 0,
          activeUsers: 0,
          activeCategories: 0,
          activeServices: 0,
          activeGigs: 0
        });
        
        return emptyStats;
      }
    },
    staleTime: 60000,
    retry: 2,
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    }
  });
};

export const useAdminUsers = (params = {}) => {
  const setUsers = useAdminStore((state) => state.setUsers);

  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      try {
        const response = await adminAPI.getUsers(params);
        if (response.data.success) {
          setUsers(response.data);
          return response.data;
        }
        throw new Error(response.data.message || 'Failed to fetch users');
      } catch (error) {
        console.error('Users error:', error);
        throw error;
      }
    },
    staleTime: 60000,
    retry: 2,
    keepPreviousData: true,
    onError: (error) => {
      if (error.response?.status !== 401) {
        toast.error('Failed to load users');
      }
    }
  });
};

export const useAdminCategories = (params = {}) => {
  const setCategories = useAdminStore((state) => state.setCategories);

  return useQuery({
    queryKey: ['admin', 'categories', params],
    queryFn: async () => {
      try {
        const response = await adminAPI.getCategories(params);
        if (response.data.success) {
          setCategories(response.data);
          return response.data;
        }
        throw new Error(response.data.message || 'Failed to fetch categories');
      } catch (error) {
        console.error('Categories error:', error);
        throw error;
      }
    },
    staleTime: 60000,
    retry: 2,
    keepPreviousData: true,
    onError: (error) => {
      if (error.response?.status !== 401) {
        toast.error('Failed to load categories');
      }
    }
  });
};

// Keep the mutation hooks as they are
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminAPI.updateUser(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(['admin', 'users']);
      
      const previousUsers = queryClient.getQueryData(['admin', 'users']);
      
      queryClient.setQueryData(['admin', 'users'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map(user => 
            user._id === id ? { ...user, ...data } : user
          )
        };
      });
      
      return { previousUsers };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('User updated successfully');
        queryClient.invalidateQueries(['admin', 'users']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['admin', 'users'], context.previousUsers);
      }
      toast.error(error.response?.data?.message || 'Update failed');
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => adminAPI.deleteUser(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['admin', 'users']);
      
      const previousUsers = queryClient.getQueryData(['admin', 'users']);
      
      queryClient.setQueryData(['admin', 'users'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter(user => user._id !== id)
        };
      });
      
      return { previousUsers };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('User deleted successfully');
        queryClient.invalidateQueries(['admin', 'users']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Delete failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['admin', 'users'], context.previousUsers);
      }
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminAPI.updateCategory(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(['admin', 'categories']);
      
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map(category => 
            category._id === id ? { ...category, ...data } : category
          )
        };
      });
      
      return { previousCategories };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Category updated successfully');
        queryClient.invalidateQueries(['admin', 'categories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      toast.error(error.response?.data?.message || 'Update failed');
    }
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => adminAPI.createCategory(data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Category created successfully');
        queryClient.invalidateQueries(['admin', 'categories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Creation failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Creation failed');
    }
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => adminAPI.deleteCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['admin', 'categories']);
      
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter(category => category._id !== id)
        };
      });
      
      return { previousCategories };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Category deleted successfully');
        queryClient.invalidateQueries(['admin', 'categories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Delete failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  });
};