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
          
          // Extract subcategory stats from categories or directly from stats
          const subcategoryStats = stats.categories || {};
          const subcategories = stats.subcategories || {};
          
          // Store in Zustand with subcategory support
          setDashboardStats({
            totalUsers: stats.overview?.totalUsers || 0,
            totalCategories: stats.categories?.totalCategories || 0,
            totalSubcategories: subcategoryStats.totalSubcategories || 
                               subcategories.total || 
                               stats.categories?.totalSubcategories || 0,
            totalServices: stats.services?.totalServices || 0,
            totalGigs: stats.gigs?.totalGigs || 0,
            activeUsers: stats.overview?.activeUsers || 0,
            activeCategories: stats.categories?.activeCategories || 0,
            activeSubcategories: subcategoryStats.activeSubcategories || 
                                subcategories.active || 
                                stats.categories?.activeSubcategories || 0,
            activeServices: stats.services?.activeServices || 0,
            activeGigs: stats.gigs?.activeGigs || 0,
            lastUpdated: new Date().toISOString()
          });
          
          return stats;
        }
        
        throw new Error(response.data.message || 'Failed to fetch dashboard stats');
      } catch (error) {
        console.error('Dashboard error:', error);
        
        // Return empty stats with subcategory fields
        const emptyStats = {
          overview: {
            totalUsers: 0,
            activeUsers: 0
          },
          categories: {
            totalCategories: 0,
            activeCategories: 0,
            totalSubcategories: 0,
            activeSubcategories: 0
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
          totalSubcategories: 0,
          totalServices: 0,
          totalGigs: 0,
          activeUsers: 0,
          activeCategories: 0,
          activeSubcategories: 0,
          activeServices: 0,
          activeGigs: 0,
          lastUpdated: new Date().toISOString()
        });
        
        return emptyStats;
      }
    },
    staleTime: 60000, // 1 minute
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
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData) => adminAPI.createUser(userData),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('User created successfully');
        queryClient.invalidateQueries(['admin', 'users']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Creation failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
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
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('[USE UPDATE USER] Updating user:', { id, data });
      
      try {
        const response = await adminAPI.updateUser(id, data);
        console.log('[USE UPDATE USER] Update response:', response.data);
        return response;
      } catch (error) {
        console.error('[USE UPDATE USER] Error:', error);
        console.error('[USE UPDATE USER] Error response:', error.response?.data);
        throw error;
      }
    },
    onMutate: async ({ id, data }) => {
      console.log('[USE UPDATE USER] Optimistic update for user:', id);
      
      await queryClient.cancelQueries(['admin', 'users']);
      
      const previousUsers = queryClient.getQueryData(['admin', 'users']);
      
      // Optimistically update the user in cache
      queryClient.setQueryData(['admin', 'users'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map(user => 
            user._id === id ? { ...user, ...data, updatedAt: new Date().toISOString() } : user
          )
        };
      });
      
      return { previousUsers };
    },
    onSuccess: (response) => {
      console.log('[USE UPDATE USER] Success:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.message || 'User updated successfully');
        
        // Invalidate and refetch all relevant queries
        queryClient.invalidateQueries(['admin', 'users']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
        
        // Also update user in single user query if it exists
        if (response.data.data?._id) {
          queryClient.setQueryData(['admin', 'users', response.data.data._id], response.data.data);
        }
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[USE UPDATE USER] Mutation error:', error);
      
      // Revert optimistic update on error
      if (context?.previousUsers) {
        queryClient.setQueryData(['admin', 'users'], context.previousUsers);
      }
      
      // Show detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update user';
      
      // Show validation errors if they exist
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err);
        });
      } else {
        toast.error(errorMessage);
      }
    },
    // Retry logic
    retry: 1,
    retryDelay: 1000
  });
};
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('[USE UPDATE CATEGORY] Updating category:', { id, data });
      
      try {
        const response = await adminAPI.updateCategory(id, data);
        console.log('[USE UPDATE CATEGORY] Update response:', response.data);
        return response;
      } catch (error) {
        console.error('[USE UPDATE CATEGORY] Error:', error);
        
        // Handle version conflict specifically
        if (error.response?.status === 409 && error.response?.data?.code === 'VERSION_CONFLICT') {
          throw new Error('This category was modified by another user. Please refresh and try again.');
        }
        
        throw error;
      }
    },
    onMutate: async ({ id, data }) => {
      console.log('[USE UPDATE CATEGORY] Optimistic update for category:', id);
      
      await queryClient.cancelQueries(['admin', 'categories']);
      
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      // Optimistically update the category in cache
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map(category => 
            category._id === id ? { 
              ...category, 
              ...data, 
              updatedAt: new Date().toISOString(),
              // Increment version for optimistic update
              version: (category.version || 1) + 1
            } : category
          )
        };
      });
      
      return { previousCategories };
    },
    onSuccess: (response) => {
      console.log('[USE UPDATE CATEGORY] Success:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Category updated successfully');
        
        // Invalidate and refetch all relevant queries
        queryClient.invalidateQueries(['admin', 'categories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
        
        // Also update category in single category query if it exists
        if (response.data.data?._id) {
          queryClient.setQueryData(['admin', 'categories', response.data.data._id], response.data.data);
        }
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[USE UPDATE CATEGORY] Mutation error:', error);
      
      // Revert optimistic update on error
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      
      // Show specific error message for version conflict
      if (error.message.includes('modified by another user')) {
        toast.error(error.message);
      } else {
        // Show other errors
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.message || 
                            'Failed to update category';
        
        toast.error(errorMessage);
      }
      
      // Show validation errors if they exist
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err);
        });
      }
    },
    retry: 0, // Don't retry on version conflicts
    retryDelay: 1000
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryData) => adminAPI.createCategory(categoryData),
    onMutate: async (categoryData) => {
      await queryClient.cancelQueries(['admin', 'categories']);
      
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      // Generate a temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempCategory = {
        _id: tempId,
        ...categoryData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __isOptimistic: true
      };
      
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: [tempCategory, ...old.data]
        };
      });
      
      return { previousCategories, tempId };
    },
    onSuccess: (response, variables, context) => {
      if (context?.tempId) {
        // Remove the optimistic entry and add the real one
        queryClient.setQueryData(['admin', 'categories'], (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data
              .filter(cat => cat._id !== context.tempId)
              .concat(response.data?.data || response.data)
          };
        });
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      toast.error(error.response?.data?.message || 'Failed to create category');
    },
    retry: 2,
    retryDelay: 1000
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, options = {} }) => {
      console.log('[USE DELETE CATEGORY] Mutation called with:', { id, options });
      
      // Handle different ID formats
      let categoryId;
      
      if (typeof id === 'object') {
        // If an object is passed, extract the _id
        categoryId = id._id || id.id;
        console.log('[USE DELETE CATEGORY] Extracted ID from object:', categoryId);
      } else {
        categoryId = id;
      }
      
      // Ensure it's a string
      categoryId = String(categoryId).trim();
      
      if (!categoryId || categoryId === 'undefined' || categoryId === 'null') {
        throw new Error('Invalid category ID');
      }
      
      console.log('[USE DELETE CATEGORY] Calling API with ID:', categoryId);
      
      return await adminAPI.deleteCategory(categoryId, options);
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
    onError: (error) => {
      console.error('[USE DELETE CATEGORY] Error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  });
};
// Add these hooks to your existing useAdminDashboard.js

export const useAdminServices = (params = {}) => {
  return useQuery({
    queryKey: ['admin', 'services', params],
    queryFn: async () => {
      try {
        const response = await adminAPI.getServices(params);
        if (response.data.success) {
          // Safely call setServices if it exists
          try {
            const { setServices } = useAdminStore.getState();
            if (typeof setServices === 'function') {
              setServices(response.data);
            } else {
              console.warn('setServices function not available in store');
            }
          } catch (storeError) {
            console.warn('Could not set services in store:', storeError);
          }
          
          return response.data;
        }
        throw new Error(response.data.message || 'Failed to fetch services');
      } catch (error) {
        console.error('Services error:', error);
        throw error;
      }
    },
    staleTime: 60000,
    retry: 2,
    keepPreviousData: true,
    onError: (error) => {
      if (error.response?.status !== 401) {
        toast.error('Failed to load services');
      }
    }
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminAPI.updateService(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(['admin', 'services']);
      
      const previousServices = queryClient.getQueryData(['admin', 'services']);
      
      queryClient.setQueryData(['admin', 'services'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map(service => 
            service._id === id ? { ...service, ...data } : service
          )
        };
      });
      
      return { previousServices };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Service updated successfully');
        queryClient.invalidateQueries(['admin', 'services']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(['admin', 'services'], context.previousServices);
      }
      toast.error(error.response?.data?.message || 'Update failed');
    }
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => adminAPI.deleteService(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['admin', 'services']);
      
      const previousServices = queryClient.getQueryData(['admin', 'services']);
      
      queryClient.setQueryData(['admin', 'services'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter(service => service._id !== id)
        };
      });
      
      return { previousServices };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Service deleted successfully');
        queryClient.invalidateQueries(['admin', 'services']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Delete failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(['admin', 'services'], context.previousServices);
      }
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  });
};

export const useBulkServiceOperations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, operation, data = {} }) => 
      adminAPI.bulkUpdateServices({ ids, operation, data }),
    onMutate: async ({ ids, operation, data }) => {
      await queryClient.cancelQueries(['admin', 'services']);
      
      const previousServices = queryClient.getQueryData(['admin', 'services']);
      
      queryClient.setQueryData(['admin', 'services'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map(service => 
            ids.includes(service._id) 
              ? { 
                  ...service, 
                  ...data,
                  ...(operation === 'activate' ? { status: 'active' } : {}),
                  ...(operation === 'pause' ? { status: 'paused' } : {}),
                  ...(operation === 'feature' ? { isFeatured: true } : {}),
                  ...(operation === 'unfeature' ? { isFeatured: false } : {}),
                  ...(operation === 'recommend' ? { isRecommended: true } : {}),
                  ...(operation === 'unrecommend' ? { isRecommended: false } : {}),
                } 
              : service
          )
        };
      });
      
      return { previousServices };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(response.data.message || 'Bulk operation completed');
        queryClient.invalidateQueries(['admin', 'services']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Bulk operation failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(['admin', 'services'], context.previousServices);
      }
      toast.error(error.response?.data?.message || 'Bulk operation failed');
    }
  });
};
// Add to useAdminDashboard.js
export const useAdminGigs = (params = {}) => {
  return useQuery({
    queryKey: ['admin', 'gigs', params],
    queryFn: async () => {
      try {
        const response = await adminAPI.getGigs(params);
        return response.data;
      } catch (error) {
        console.error('Gigs error:', error);
        throw error;
      }
    },
    staleTime: 60000,
    retry: 2,
    keepPreviousData: true,
    onError: (error) => {
      if (error.response?.status !== 401) {
        toast.error('Failed to load gigs');
      }
    }
  });
};

export const useCreateGig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => adminAPI.createGig(data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Gig created successfully');
        queryClient.invalidateQueries(['admin', 'gigs']);
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

export const useUpdateGig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminAPI.updateGig(id, data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Gig updated successfully');
        queryClient.invalidateQueries(['admin', 'gigs']);
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  });
};

// In useAdminDashboard.js or similar
export const useDeleteGig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, options = {} }) => {
      console.log('[USE DELETE GIG] Mutation called with:', { id, options });
      
      // Handle different ID formats
      let gigId;
      
      if (typeof id === 'object') {
        // If an object is passed, extract the _id
        gigId = id._id || id.id;
        console.log('[USE DELETE GIG] Extracted ID from object:', gigId);
      } else {
        gigId = id;
      }
      
      // Ensure it's a string
      gigId = String(gigId).trim();
      
      if (!gigId || gigId === 'undefined' || gigId === 'null') {
        throw new Error('Invalid gig ID');
      }
      
      console.log('[USE DELETE GIG] Calling API with ID:', gigId);
      
      // For admin delete, use the admin endpoint
      return await adminAPI.deleteGig(gigId, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'gigs']);
      toast.success('Gig deleted successfully');
    },
    onError: (error) => {
      console.error('[USE DELETE GIG] Error:', error);
      toast.error(error.message || 'Failed to delete gig');
    }
  });
};

export const useBulkGigOperations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, operation, data = {} }) => 
      adminAPI.bulkUpdateGigs({ ids, operation, data }),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(response.data.message || 'Bulk operation completed');
        queryClient.invalidateQueries(['admin', 'gigs']);
      } else {
        toast.error(response.data.message || 'Bulk operation failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bulk operation failed');
    }
  });
};

export const useCategoriesForDropdown = () => {
  return useQuery({
    queryKey: ['admin', 'categories', 'dropdown'],
    queryFn: async () => {
      try {
        const response = await adminAPI.getCategoriesForDropdown();
        return response.data;
      } catch (error) {
        console.error('Categories dropdown error:', error);
        return { data: [] };
      }
    },
    staleTime: 300000,
  });
};

export const useUsersForDropdown = (role = '') => {
  return useQuery({
    queryKey: ['admin', 'users', 'dropdown', role],
    queryFn: async () => {
      try {
        const response = await adminAPI.getUsersForDropdown(role);
        return response.data;
      } catch (error) {
        console.error('Users dropdown error:', error);
        return { data: [] };
      }
    },
    staleTime: 300000,
  });
};
// Add this to your useAdminDashboard.js file
// In useAdminDashboard.js - Add the bulk category operations hook
export const useBulkCategoryOperations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, operation, data = {} }) => 
      adminAPI.bulkUpdateCategories({ ids, operation, data }),
    onMutate: async ({ ids, operation, data }) => {
      await queryClient.cancelQueries(['admin', 'categories']);
      
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map(category => 
            ids.includes(category._id) 
              ? { 
                  ...category, 
                  ...data,
                  ...(operation === 'activate' ? { isActive: true } : {}),
                  ...(operation === 'deactivate' ? { isActive: false } : {}),
                  ...(operation === 'feature' ? { featured: true } : {}),
                  ...(operation === 'unfeature' ? { featured: false } : {}),
                  ...(operation === 'popular' ? { popular: true } : {}),
                  ...(operation === 'unpopular' ? { popular: false } : {}),
                } 
              : category
          )
        };
      });
      
      return { previousCategories };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(response.data.message || 'Bulk operation completed');
        queryClient.invalidateQueries(['admin', 'categories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Bulk operation failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      toast.error(error.response?.data?.message || 'Bulk operation failed');
    }
  });
};
// In useAdminDashboard.js - Add these hooks:

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => adminApi.post('/api/services/admin/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Service created successfully');
        queryClient.invalidateQueries(['admin', 'services']);
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

export const useServiceStats = () => {
  return useQuery({
    queryKey: ['admin', 'services', 'stats'],
    queryFn: async () => {
      try {
        const response = await adminAPI.getServiceStats();
        return response.data;
      } catch (error) {
        console.error('Service stats error:', error);
        throw error;
      }
    },
    staleTime: 30000,
    retry: 2
  });
};

export const useAdminSubcategories = (params = {}) => {
  const setSubcategories = useAdminStore((state) => state.setSubcategories);

  return useQuery({
    queryKey: ['admin', 'subcategories', params],
    queryFn: async () => {
      try {
        const response = await adminAPI.getSubcategories(params);
        if (response.data.success) {
          setSubcategories(response.data);
          return response.data;
        }
        throw new Error(response.data.message || 'Failed to fetch subcategories');
      } catch (error) {
        console.error('Subcategories error:', error);
        throw error;
      }
    },
    staleTime: 60000,
    retry: 2,
    keepPreviousData: true,
    onError: (error) => {
      if (error.response?.status !== 401) {
        toast.error('Failed to load subcategories');
      }
    }
  });
};

export const useCreateSubcategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subcategoryData) => adminAPI.createSubcategory(subcategoryData),
    onMutate: async (subcategoryData) => {
      await queryClient.cancelQueries(['admin', 'subcategories']);
      
      const previousSubcategories = queryClient.getQueryData(['admin', 'subcategories']);
      
      // Generate a temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempSubcategory = {
        _id: tempId,
        ...subcategoryData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __isOptimistic: true
      };
      
      queryClient.setQueryData(['admin', 'subcategories'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: [tempSubcategory, ...old.data]
        };
      });
      
      return { previousSubcategories, tempId };
    },
    onSuccess: (response, variables, context) => {
      if (response.data.success) {
        toast.success('Subcategory created successfully');
        
        // Remove optimistic entry and add the real one
        if (context?.tempId) {
          queryClient.setQueryData(['admin', 'subcategories'], (old) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data
                .filter(sub => sub._id !== context.tempId)
                .concat(response.data?.data || response.data)
            };
          });
        }
        
        queryClient.invalidateQueries(['admin', 'subcategories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Creation failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousSubcategories) {
        queryClient.setQueryData(['admin', 'subcategories'], context.previousSubcategories);
      }
      toast.error(error.response?.data?.message || 'Failed to create subcategory');
    }
  });
};

export const useUpdateSubcategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminAPI.updateSubcategory(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(['admin', 'subcategories']);
      
      const previousSubcategories = queryClient.getQueryData(['admin', 'subcategories']);
      
      queryClient.setQueryData(['admin', 'subcategories'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map(subcategory => 
            subcategory._id === id 
              ? { ...subcategory, ...data, updatedAt: new Date().toISOString() }
              : subcategory
          )
        };
      });
      
      return { previousSubcategories };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Subcategory updated successfully');
        queryClient.invalidateQueries(['admin', 'subcategories']);
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousSubcategories) {
        queryClient.setQueryData(['admin', 'subcategories'], context.previousSubcategories);
      }
      toast.error(error.response?.data?.message || 'Failed to update subcategory');
    }
  });
};

export const useDeleteSubcategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, options = {} }) => adminAPI.deleteSubcategory(id, options),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries(['admin', 'subcategories']);
      
      const previousSubcategories = queryClient.getQueryData(['admin', 'subcategories']);
      
      queryClient.setQueryData(['admin', 'subcategories'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter(subcategory => subcategory._id !== id)
        };
      });
      
      return { previousSubcategories };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Subcategory deleted successfully');
        queryClient.invalidateQueries(['admin', 'subcategories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Delete failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousSubcategories) {
        queryClient.setQueryData(['admin', 'subcategories'], context.previousSubcategories);
      }
      toast.error(error.response?.data?.message || 'Failed to delete subcategory');
    }
  });
};

export const useBulkSubcategoryOperations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, operation, data = {} }) => 
      adminAPI.bulkUpdateSubcategories({ ids, operation, data }),
    onMutate: async ({ ids, operation, data }) => {
      await queryClient.cancelQueries(['admin', 'subcategories']);
      
      const previousSubcategories = queryClient.getQueryData(['admin', 'subcategories']);
      
      queryClient.setQueryData(['admin', 'subcategories'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map(subcategory => 
            ids.includes(subcategory._id) 
              ? { 
                  ...subcategory, 
                  ...data,
                  ...(operation === 'activate' ? { isActive: true } : {}),
                  ...(operation === 'deactivate' ? { isActive: false } : {}),
                } 
              : subcategory
          )
        };
      });
      
      return { previousSubcategories };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(response.data.message || 'Bulk operation completed');
        queryClient.invalidateQueries(['admin', 'subcategories']);
      } else {
        toast.error(response.data.message || 'Bulk operation failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousSubcategories) {
        queryClient.setQueryData(['admin', 'subcategories'], context.previousSubcategories);
      }
      toast.error(error.response?.data?.message || 'Bulk operation failed');
    }
  });
};
// In useAdminDashboard.js - Add these missing hooks

// Bulk user operations hook
export const useBulkUserOperations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, operation, data = {} }) => 
      adminAPI.bulkUpdateUsers({ ids, operation, data }),
    onMutate: async ({ ids, operation, data }) => {
      await queryClient.cancelQueries(['admin', 'users']);
      
      const previousUsers = queryClient.getQueryData(['admin', 'users']);
      
      queryClient.setQueryData(['admin', 'users'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map(user => 
            ids.includes(user._id) 
              ? { 
                  ...user, 
                  ...data,
                  ...(operation === 'activate' ? { isActive: true } : {}),
                  ...(operation === 'deactivate' ? { isActive: false } : {}),
                  ...(operation === 'verify-email' ? { emailVerified: true } : {}),
                  ...(operation === 'unverify-email' ? { emailVerified: false } : {}),
                  ...(operation === 'promote-admin' ? { role: 'admin' } : {}),
                  ...(operation === 'demote-user' ? { role: 'user' } : {})
                } 
              : user
          )
        };
      });
      
      return { previousUsers };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(response.data.message || 'Bulk operation completed');
        queryClient.invalidateQueries(['admin', 'users']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Bulk operation failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['admin', 'users'], context.previousUsers);
      }
      toast.error(error.response?.data?.message || 'Bulk operation failed');
    }
  });
};

// Export functions hooks
export const useExportUsers = () => {
  return useMutation({
    mutationFn: (format = 'csv') => adminAPI.exportUsers(format),
    onSuccess: () => {
      toast.success('Export started successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Export failed');
    }
  });
};
export const useExportCategories = () => {
  return useMutation({
    mutationFn: (format = 'csv') => adminAPI.exportCategories(format),
    onSuccess: () => {
      toast.success('Categories export started successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Export failed');
    }
  });
};

export const useExportSubcategories = () => {
  return useMutation({
    mutationFn: (format = 'csv') => adminAPI.exportSubcategories(format),
    onSuccess: () => {
      toast.success('Subcategories export started successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Export failed');
    }
  });
};

export const useExportServices = () => {
  return useMutation({
    mutationFn: (format = 'csv') => adminAPI.exportServices(format),
    onSuccess: () => {
      toast.success('Services export started successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Export failed');
    }
  });
};

export const useExportGigs = () => {
  return useMutation({
    mutationFn: (format = 'csv') => adminAPI.exportGigs(format),
    onSuccess: () => {
      toast.success('Gigs export started successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Export failed');
    }
  });
};

// Stats hooks
export const useCategoryStats = () => {
  return useQuery({
    queryKey: ['admin', 'categories', 'stats'],
    queryFn: async () => {
      try {
        const response = await adminAPI.getCategoryStats();
        return response.data;
      } catch (error) {
        console.error('Category stats error:', error);
        throw error;
      }
    },
    staleTime: 30000,
    retry: 2
  });
};

export const useSubcategoryStats = () => {
  return useQuery({
    queryKey: ['admin', 'subcategories', 'stats'],
    queryFn: async () => {
      try {
        const response = await adminAPI.getSubcategoryStats();
        return response.data;
      } catch (error) {
        console.error('Subcategory stats error:', error);
        throw error;
      }
    },
    staleTime: 30000,
    retry: 2
  });
};

export const useGigStats = () => {
  return useQuery({
    queryKey: ['admin', 'gigs', 'stats'],
    queryFn: async () => {
      try {
        const response = await adminAPI.getGigStats();
        return response.data;
      } catch (error) {
        console.error('Gig stats error:', error);
        throw error;
      }
    },
    staleTime: 30000,
    retry: 2
  });
};

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: async () => {
      try {
        const response = await adminAPI.getSystemHealth();
        return response.data;
      } catch (error) {
        console.error('System health error:', error);
        throw error;
      }
    },
    staleTime: 10000, // 10 seconds for system health
    retry: 1
  });
};

// Additional dashboard data hooks
export const useRecentActivities = (limit = 10) => {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'activities', limit],
    queryFn: async () => {
      try {
        const response = await adminAPI.getRecentActivities(limit);
        return response.data;
      } catch (error) {
        console.error('Recent activities error:', error);
        return { data: [] };
      }
    },
    staleTime: 30000,
    retry: 2
  });
};

export const useChartData = (chartType, timeRange = '7d') => {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'charts', chartType, timeRange],
    queryFn: async () => {
      try {
        const response = await adminAPI.getChartData(chartType, timeRange);
        return response.data;
      } catch (error) {
        console.error('Chart data error:', error);
        return { data: [] };
      }
    },
    staleTime: 60000,
    retry: 2
  });
};

// Subcategories by category hook
export const useSubcategoriesByCategory = (categoryId, params = {}) => {
  return useQuery({
    queryKey: ['admin', 'subcategories', 'by-category', categoryId, params],
    queryFn: async () => {
      try {
        const response = await adminAPI.getSubcategoriesDropdown(categoryId, params);
        return response.data;
      } catch (error) {
        console.error('Subcategories by category error:', error);
        return { data: [] };
      }
    },
    enabled: !!categoryId,
    staleTime: 300000,
  });
};