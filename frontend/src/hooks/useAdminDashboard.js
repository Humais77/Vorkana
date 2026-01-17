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
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to fetch stats');
        }

        const stats = response.data.data;

        console.log('[DASHBOARD STATS] Raw data:', stats);

        // Extract safely with fallbacks
        const overview = stats.overview || {};
        const categories = stats.categories || {};
        const services = stats.services || {};
        const gigs = stats.gigs || {};

        const dashboardData = {
          totalUsers: overview.totalUsers || 0,
          activeUsers: overview.activeUsers || 0,
          
          totalCategories: categories.totalCategories || 0,
          activeCategories: categories.activeCategories || 0,
          
          // Note: Subcategories are now separate, these might come from different endpoint
          totalSubcategories: categories.totalSubcategories || 0,
          activeSubcategories: categories.activeSubcategories || 0,
          
          totalServices: services.totalServices || 0,
          activeServices: services.activeServices || 0,
          
          totalGigs: gigs.totalGigs || 0,
          activeGigs: gigs.activeGigs || 0,
          
          lastUpdated: new Date().toISOString()
        };

        console.log('[DASHBOARD STATS] Processed for store:', dashboardData);

        // Update Zustand store
        setDashboardStats(dashboardData);

        return stats; // Return full stats if needed elsewhere
      } catch (error) {
        console.error('Dashboard fetch error:', error);

        // Fallback: zero everything
        const fallback = {
          totalUsers: 0,
          activeUsers: 0,
          totalCategories: 0,
          activeCategories: 0,
          totalSubcategories: 0,
          activeSubcategories: 0,
          totalServices: 0,
          activeServices: 0,
          totalGigs: 0,
          activeGigs: 0,
          lastUpdated: new Date().toISOString()
        };

        setDashboardStats(fallback);

        toast.error('Failed to load dashboard stats');
        return fallback;
      }
    },
    staleTime: 60000,
    retry: 3,
    refetchOnWindowFocus: true,
    onError: (error) => {
      toast.error('Dashboard loading failed');
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
    queryKey: generateCategoryQueryKey(params),
    queryFn: async () => {
      console.log('[FETCH CATEGORIES] Params:', params);
      
      try {
        // Add default admin parameters
        const queryParams = {
          ...params,
          showAll: true,
          isAdmin: true,
          populate: true
        };
        
        const response = await adminAPI.getCategories(queryParams);
        console.log('[FETCH CATEGORIES] Response success:', response.data?.success);
        
        if (response.data.success) {
          setCategories(response.data);
          return response.data;
        }
        
        throw new Error(response.data.message || 'Failed to fetch categories');
      } catch (error) {
        console.error('[FETCH CATEGORIES ERROR]', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute cache time
    retry: 2,
    retryDelay: 1000,
    keepPreviousData: true,
    refetchOnWindowFocus: false, // Prevent unwanted refetches
    onError: (error) => {
      console.error('Categories fetch error:', error);
      
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error('Failed to load categories');
      }
    }
  });
};


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
    mutationFn: async (params) => {
      console.log('[USE DELETE USER] Mutation called with:', params);
      
      // Handle both string ID and object with options
      let id;
      let options = {};
      
      if (typeof params === 'string') {
        id = params;
      } else if (params && typeof params === 'object') {
        id = params.id || params._id;
        options = {
          permanent: params.permanent || false,
          force: params.force || false,
          reason: params.reason || ''
        };
      } else {
        throw new Error('Invalid parameters for delete user');
      }
      
      // Validate ID
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid user ID');
      }
      
      // Clean up ID if it contains [object Object]
      if (typeof id === 'object') {
        id = id._id || id.id || JSON.stringify(id);
      }
      
      console.log('[USE DELETE USER] Calling API with:', { id, options });
      
      // For admin delete, use the admin endpoint
      return await adminAPI.deleteUser(id, options);
    },
    onMutate: async (params) => {
      // Extract ID from params (could be string or object)
      let id;
      if (typeof params === 'string') {
        id = params;
      } else if (params && typeof params === 'object') {
        id = params.id || params._id;
      }
      
      if (!id) return;
      
      // Clean up ID
      if (typeof id === 'object') {
        id = id._id || id.id;
      }
      
      await queryClient.cancelQueries(['admin', 'users']);
      
      const previousUsers = queryClient.getQueryData(['admin', 'users']);
      
      queryClient.setQueryData(['admin', 'users'], (old) => {
        if (!old || !old.data) return old;
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
      console.error('[USE DELETE USER ERROR]', error);
      
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
        
        // Re-throw the error with more context
        throw {
          ...error,
          userFriendlyMessage: error.response?.data?.message || 
                              error.response?.data?.error || 
                              'Failed to update user. Please try again.',
          validationErrors: error.response?.data?.errors || []
        };
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
    retry: 1,
    retryDelay: 1000
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryData) => {
      console.log('[CREATE CATEGORY] Sending data:', categoryData);
      const response = await adminAPI.createCategory(categoryData);
      console.log('[CREATE CATEGORY] Response:', response.data);
      return response;
    },
    onMutate: async (categoryData) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries(['admin', 'categories']);
      
      // Store previous data for rollback
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      // Generate optimistic category with temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimisticCategory = {
        _id: tempId,
        ...categoryData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        servicesCount: 0,
        gigsCount: 0,
        __isOptimistic: true
      };
      
      // Update cache optimistically
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: [optimisticCategory, ...old.data],
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1
          }
        };
      });
      
      // Return context for rollback
      return { 
        previousCategories, 
        tempId,
        optimisticCategory 
      };
    },
    onSuccess: (response, variables, context) => {
      console.log('[CREATE CATEGORY] Success:', response.data);
      
      if (response.data.success) {
        toast.success('Category created successfully');
        
        // Replace optimistic entry with real data
        if (context?.tempId) {
          queryClient.setQueryData(['admin', 'categories'], (old) => {
            if (!old || !old.data) return old;
            
            const newData = old.data.map(item => 
              item._id === context.tempId ? response.data.data : item
            ).filter(item => !item.__isOptimistic); // Remove any remaining optimistic items
            
            return {
              ...old,
              data: newData
            };
          });
        }
        
        // Invalidate and refetch after a short delay
        setTimeout(() => {
          queryClient.invalidateQueries(['admin', 'categories']);
          queryClient.invalidateQueries(['admin', 'dashboard']);
        }, 500);
      } else {
        toast.error(response.data.message || 'Creation failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[CREATE CATEGORY ERROR]', error);
      
      // Rollback optimistic update
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      
      // Show error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to create category';
      
      // Show validation errors if they exist
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err);
        });
      } else {
        toast.error(errorMessage);
      }
    }
  });
};

// Fix: Update Category Hook with version conflict handling
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('[UPDATE CATEGORY] Updating:', { id, data });
      
      // Remove any __isOptimistic flags from data
      const cleanData = { ...data };
      delete cleanData.__isOptimistic;
      
      const response = await adminAPI.updateCategory(id, cleanData);
      console.log('[UPDATE CATEGORY] Response:', response.data);
      return response;
    },
    onMutate: async ({ id, data }) => {
      console.log('[UPDATE CATEGORY] Optimistic update for:', id);
      
      // Cancel outgoing queries
      await queryClient.cancelQueries(['admin', 'categories']);
      
      // Store previous data for rollback
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      // Update cache optimistically
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map(category => 
            category._id === id 
              ? { 
                  ...category, 
                  ...data,
                  updatedAt: new Date().toISOString(),
                  __isUpdating: true // Mark as updating
                } 
              : category
          )
        };
      });
      
      // Update specific category cache if it exists
      queryClient.setQueryData(['admin', 'categories', id], (old) => {
        if (!old) return old;
        return {
          ...old,
          ...data,
          updatedAt: new Date().toISOString()
        };
      });
      
      return { previousCategories };
    },
    onSuccess: (response, variables, context) => {
      console.log('[UPDATE CATEGORY] Success:', response.data);
      
      if (response.data.success) {
        toast.success('Category updated successfully');
        
        // Update the specific category in cache
        if (response.data.data) {
          queryClient.setQueryData(['admin', 'categories', variables.id], response.data.data);
        }
        
        // Invalidate and refetch after a short delay
        setTimeout(() => {
          queryClient.invalidateQueries(['admin', 'categories']);
          queryClient.invalidateQueries(['admin', 'categories', variables.id]);
        }, 300);
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[UPDATE CATEGORY ERROR]', error);
      
      // Rollback optimistic update
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      
      // Handle version conflict
      if (error.response?.status === 409) {
        toast.error('Category was modified by another user. Please refresh and try again.');
        // Force refetch
        queryClient.invalidateQueries(['admin', 'categories']);
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            'Failed to update category';
        
        toast.error(errorMessage);
      }
    }
  });
};

// Fix: Delete Category Hook with immediate UI update
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deleteOptions) => {
      console.log('[DELETE CATEGORY] Options:', deleteOptions);
      
      // Handle different parameter formats
      const { id, permanent = false, force = false } = deleteOptions;
      
      if (!id) {
        throw new Error('Category ID is required');
      }
      
      const params = {
        permanent: String(permanent).toLowerCase(),
        force: String(force).toLowerCase()
      };
      
      return await adminAPI.deleteCategory(id, params);
    },
    onMutate: async (deleteOptions) => {
      const { id } = deleteOptions;
      
      console.log('[DELETE CATEGORY] Optimistic delete for:', id);
      
      // Cancel outgoing queries
      await queryClient.cancelQueries(['admin', 'categories']);
      
      // Store previous data for rollback
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      // Remove from cache immediately
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old || !old.data) return old;
        
        const newData = old.data.filter(category => category._id !== id);
        
        return {
          ...old,
          data: newData,
          pagination: {
            ...old.pagination,
            total: old.pagination.total - 1
          }
        };
      });
      
      // Remove specific category cache
      queryClient.removeQueries(['admin', 'categories', id]);
      
      return { previousCategories, deletedId: id };
    },
    onSuccess: (response, variables, context) => {
      console.log('[DELETE CATEGORY] Success:', response.data);
      
      if (response.data.success) {
        const message = variables.permanent 
          ? 'Category permanently deleted' 
          : 'Category soft deleted successfully';
        toast.success(message);
        
        // Invalidate related queries after a delay
        setTimeout(() => {
          queryClient.invalidateQueries(['admin', 'categories']);
          queryClient.invalidateQueries(['admin', 'dashboard']);
          queryClient.invalidateQueries(['admin', 'categories', 'stats']);
        }, 500);
      } else {
        toast.error(response.data.message || 'Delete failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[DELETE CATEGORY ERROR]', error);
      
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      
      // Show appropriate error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to delete category';
      
      toast.error(errorMessage);
    }
  });
};

// Fix: Add cache key generator for consistent queries
const generateCategoryQueryKey = (params = {}) => {
  const baseKey = ['admin', 'categories'];
  
  // Only include non-empty, non-null params
  const filteredParams = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      filteredParams[key] = params[key];
    }
  });
  
  // Sort params for consistent cache keys
  const sortedKeys = Object.keys(filteredParams).sort();
  const sortedParams = {};
  sortedKeys.forEach(key => {
    sortedParams[key] = filteredParams[key];
  });
  
  if (Object.keys(sortedParams).length > 0) {
    return [...baseKey, sortedParams];
  }
  
  return baseKey;
};

export const useRestoreCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      console.log('[USE RESTORE CATEGORY] Restoring category:', id);
      
      // Handle different ID formats
      let categoryId;
      
      if (typeof id === 'object') {
        // If an object is passed, extract the _id
        categoryId = id._id || id.id;
        console.log('[USE RESTORE CATEGORY] Extracted ID from object:', categoryId);
      } else {
        categoryId = id;
      }
      
      // Ensure it's a string
      categoryId = String(categoryId).trim();
      
      if (!categoryId || categoryId === 'undefined' || categoryId === 'null') {
        throw new Error('Invalid category ID');
      }
      
      console.log('[USE RESTORE CATEGORY] Calling API with ID:', categoryId);
      
      return await adminAPI.restoreCategory(categoryId);
    },
    onMutate: async (id) => {
      console.log('[USE RESTORE CATEGORY] Optimistic update for category:', id);
      
      await queryClient.cancelQueries(['admin', 'categories']);
      
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      // Optimistically update the category in cache
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map(category => 
            category._id === id 
              ? { 
                  ...category, 
                  isActive: true,
                  deletedAt: null,
                  deletedBy: null,
                  updatedAt: new Date().toISOString()
                } 
              : category
          )
        };
      });
      
      return { previousCategories };
    },
    onSuccess: (response) => {
      console.log('[USE RESTORE CATEGORY] Success:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Category restored successfully');
        
        // Invalidate and refetch all relevant queries
        queryClient.invalidateQueries(['admin', 'categories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
        queryClient.invalidateQueries(['admin', 'categories', 'stats']);
        
        // Also update category in single category query if it exists
        if (response.data.data?._id) {
          queryClient.setQueryData(['admin', 'categories', response.data.data._id], response.data.data);
        }
      } else {
        toast.error(response.data.message || 'Restore failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[USE RESTORE CATEGORY] Mutation error:', error);
      
      // Revert optimistic update on error
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      
      // Show error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to restore category';
      
      toast.error(errorMessage);
    }
  });
};

// Bulk restore categories hook
export const useBulkRestoreCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids) => adminAPI.bulkRestoreCategories(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries(['admin', 'categories']);
      
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      // Optimistically update categories in cache
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map(category => 
            ids.includes(category._id) 
              ? { 
                  ...category, 
                  isActive: true,
                  deletedAt: null,
                  deletedBy: null,
                  updatedAt: new Date().toISOString()
                } 
              : category
          )
        };
      });
      
      return { previousCategories };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(`Successfully restored ${response.data.count || 0} categories`);
        
        // Invalidate and refetch
        queryClient.invalidateQueries(['admin', 'categories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
        queryClient.invalidateQueries(['admin', 'categories', 'stats']);
      } else {
        toast.error(response.data.message || 'Bulk restore failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      
      toast.error(error.response?.data?.message || 'Bulk restore failed');
    }
  });
};

export const useAdminServices = (params = {}) => {
  return useQuery({
    queryKey: ['admin', 'services', params],
    queryFn: async () => {
      try {
        // Always include full details for admin
        const response = await adminAPI.getServices({
          ...params,
          includeFullDetails: true,
          populateSubcategories: true
        });
        
        if (response.data.success) {
          // Process the data to ensure all fields exist
          const processedData = {
            ...response.data,
            data: response.data.data?.map(service => ({
              ...service,
              // Ensure arrays exist
              tags: service.tags || [],
              features: service.features || [],
              faqs: service.faqs || [],
              requirements: service.requirements || [],
              searchKeywords: service.searchKeywords || [],
              images: service.images || [],
              // Ensure nested objects exist
              category: service.category || { name: 'Unknown Category' },
              subcategory: service.subcategory || { name: 'No Subcategory' },
              createdBy: service.createdBy || { name: 'Unknown User' }
            })) || []
          };
          
          return processedData;
        }
        throw new Error(response.data.message || 'Failed to fetch services');
      } catch (error) {
        console.error('Services error:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 2,
    keepPreviousData: true,
    onError: (error) => {
      if (error.response?.status !== 401) {
        toast.error('Failed to load services');
      }
    }
  });
};

export const useRestoreService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data = {} }) => {
      console.log('[USE RESTORE SERVICE] Restoring service:', id);
      
      try {
        const response = await adminAPI.restoreService(id, data);
        console.log('[USE RESTORE SERVICE] Restore response:', response.data);
        return response;
      } catch (error) {
        console.error('[USE RESTORE SERVICE] Error:', error);
        throw error;
      }
    },
    onMutate: async ({ id, data }) => {
      console.log('[USE RESTORE SERVICE] Optimistic update for service:', id);
      
      await queryClient.cancelQueries(['admin', 'services']);
      
      const previousServices = queryClient.getQueryData(['admin', 'services']);
      
      // Optimistically update the service in cache
      queryClient.setQueryData(['admin', 'services'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map(service => 
            service._id === id 
              ? { 
                  ...service, 
                  status: 'active',
                  isActive: true,
                  updatedAt: new Date().toISOString()
                } 
              : service
          )
        };
      });
      
      return { previousServices };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Service restored successfully');
        
        // Invalidate and refetch
        queryClient.invalidateQueries(['admin', 'services']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Restore failed');
      }
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousServices) {
        queryClient.setQueryData(['admin', 'services'], context.previousServices);
      }
      
      toast.error(error.response?.data?.message || 'Failed to restore service');
    }
  });
};

// Add bulk restore hook
export const useBulkRestoreServices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids) => adminAPI.bulkRestoreServices(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries(['admin', 'services']);
      
      const previousServices = queryClient.getQueryData(['admin', 'services']);
      
      queryClient.setQueryData(['admin', 'services'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map(service => 
            ids.includes(service._id) 
              ? { 
                  ...service, 
                  status: 'active',
                  isActive: true,
                  updatedAt: new Date().toISOString()
                } 
              : service
          )
        };
      });
      
      return { previousServices };
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(`Successfully restored ${response.data.results?.filter(r => r.success).length || 0} services`);
        
        // Invalidate and refetch
        queryClient.invalidateQueries(['admin', 'services']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
      } else {
        toast.error(response.data.message || 'Bulk restore failed');
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(['admin', 'services'], context.previousServices);
      }
      
      toast.error(error.response?.data?.message || 'Bulk restore failed');
    }
  });
};

// Update useUpdateService for faster cache updates
export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('[USE UPDATE SERVICE] Updating service:', { id, data });
      
      try {
        const response = await adminAPI.updateService(id, data);
        console.log('[USE UPDATE SERVICE] Update response:', response.data);
        return response;
      } catch (error) {
        console.error('[USE UPDATE SERVICE] Error:', error);
        
        throw error;
      }
    },
    onMutate: async ({ id, data }) => {
      console.log('[USE UPDATE SERVICE] Optimistic update for service:', id);
      
      // Cancel ongoing queries
      await queryClient.cancelQueries(['admin', 'services']);
      
      const previousServices = queryClient.getQueryData(['admin', 'services']);
      
      // Fast optimistic update
      queryClient.setQueryData(['admin', 'services'], (old) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map(service => 
            service._id === id 
              ? { 
                  ...service, 
                  ...data,
                  updatedAt: new Date().toISOString()
                } 
              : service
          )
        };
      });
      
      return { previousServices };
    },
    onSuccess: (response, variables, context) => {
      console.log('[USE UPDATE SERVICE] Success:', response.data);
      
      if (response.data.success) {
        toast.success('Service updated successfully');
        
        // Fast cache update with received data
        if (response.data.service) {
          queryClient.setQueryData(['admin', 'services'], (old) => {
            if (!old || !old.data) return old;
            
            return {
              ...old,
              data: old.data.map(service => 
                service._id === response.data.service._id 
                  ? { ...service, ...response.data.service }
                  : service
              )
            };
          });
        }
        
        // Only invalidate for fresh data
        setTimeout(() => {
          queryClient.invalidateQueries(['admin', 'services']);
          queryClient.invalidateQueries(['admin', 'dashboard']);
        }, 100);
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[USE UPDATE SERVICE] Mutation error:', error);
      
      // Fast revert
      if (context?.previousServices) {
        queryClient.setQueryData(['admin', 'services'], context.previousServices);
      }
      
      // Show validation errors
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err);
        });
      } else {
        toast.error(error.response?.data?.message || 'Failed to update service');
      }
    },
    retry: 1,
    retryDelay: 500
  });
};

// Add poll mechanism for real-time updates
export const useServicePolling = (params = {}) => {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  const { data, refetch, ...rest } = useAdminServices(params);
  
  // Poll for updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [refetch]);
  
  return { data, refetch, lastUpdate, ...rest };
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params) => {
      // Handle both string ID and object with options
      let id;
      let options = {};
      
      if (typeof params === 'string') {
        id = params;
      } else if (params && typeof params === 'object') {
        id = params.id || params._id;
        options = {
          permanent: params.permanent || false,
          force: params.force || false
        };
      } else {
        throw new Error('Invalid parameters for delete service');
      }
      
      // Validate ID
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid service ID');
      }
      
      console.log('[USE DELETE SERVICE] Deleting with:', { id, options });
      
      // For admin delete, use the admin endpoint
      return await adminAPI.deleteService(id, options);
    },
    onMutate: async (params) => {
      // Extract ID from params (could be string or object)
      const id = typeof params === 'string' ? params : (params?.id || params?._id);
      
      if (!id) return;
      
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
    mutationFn: async ({ id, data }) => {
      console.log('[USE UPDATE GIG] Updating with version:', data.version);
      
      try {
        const response = await adminAPI.updateGig(id, data);
        
        // Check for version conflict
        if (response.status === 409) {
          throw {
            response: {
              status: 409,
              data: response.data
            }
          };
        }
        
        return response;
      } catch (error) {
        console.error('[USE UPDATE GIG] Error:', error);
        throw error;
      }
    },
    onMutate: async ({ id, data }) => {
      // Store current data for rollback
      const previousData = queryClient.getQueryData(['admin', 'gigs', id]);
      
      // Optimistically update
      queryClient.setQueryData(['admin', 'gigs', id], (old) => {
        if (!old) return old;
        return {
          ...old,
          ...data,
          version: old.version + 1
        };
      });
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['admin', 'gigs', variables.id], context.previousData);
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate query to fetch fresh data
      queryClient.invalidateQueries(['admin', 'gigs', variables.id]);
    }
  });
};

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
export const useBulkCategoryOperations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, operation, data = {} }) => {
      console.log('[BULK CATEGORY] Operation:', operation, 'IDs:', ids);
      return await adminAPI.bulkUpdateCategories({ ids, operation, data });
    },
    onMutate: async ({ ids, operation, data }) => {
      console.log('[BULK CATEGORY] Optimistic update for:', ids);
      
      await queryClient.cancelQueries(['admin', 'categories']);
      
      const previousCategories = queryClient.getQueryData(['admin', 'categories']);
      
      // Optimistic update
      queryClient.setQueryData(['admin', 'categories'], (old) => {
        if (!old || !old.data) return old;
        
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
                  updatedAt: new Date().toISOString()
                } 
              : category
          )
        };
      });
      
      return { previousCategories };
    },
    onSuccess: (response, variables, context) => {
      console.log('[BULK CATEGORY] Success:', response.data);
      
      if (response.data.success) {
        toast.success(`Successfully ${variables.operation}d ${variables.ids.length} categories`);
        
        // Force refetch after successful bulk operation
        setTimeout(() => {
          queryClient.invalidateQueries(['admin', 'categories']);
        }, 500);
      } else {
        toast.error(response.data.message || 'Bulk operation failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[BULK CATEGORY ERROR]', error);
      
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Bulk operation failed';
      
      toast.error(errorMessage);
    }
  });
};

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

// KEEP THESE - These are for SEPARATE Subcategory management
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
    mutationFn: async (subcategoryData) => {
      console.log('[CREATE SUBCATEGORY] Sending data:', subcategoryData);
      const response = await adminAPI.createSubcategory(subcategoryData);
      console.log('[CREATE SUBCATEGORY] Response:', response.data);
      return response;
    },
    onMutate: async (subcategoryData) => {
      console.log('[CREATE SUBCATEGORY] Optimistic update started');
      
      // Cancel outgoing queries
      await queryClient.cancelQueries(['admin', 'subcategories']);
      
      // Store previous data for rollback
      const previousSubcategories = queryClient.getQueryData(['admin', 'subcategories']);
      
      // Generate optimistic subcategory with temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimisticSubcategory = {
        _id: tempId,
        ...subcategoryData,
        name: subcategoryData.name,
        slug: subcategoryData.slug || subcategoryData.name.toLowerCase().replace(/\s+/g, '-'),
        description: subcategoryData.description || '',
        category: subcategoryData.category,
        order: subcategoryData.order || 0,
        isActive: subcategoryData.isActive !== undefined ? subcategoryData.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        servicesCount: 0,
        gigsCount: 0,
        __isOptimistic: true,
        __tempId: tempId
      };
      
      console.log('[CREATE SUBCATEGORY] Optimistic subcategory:', optimisticSubcategory);
      
      // Update cache optimistically
      queryClient.setQueryData(['admin', 'subcategories'], (old) => {
        console.log('[CREATE SUBCATEGORY] Old data:', old);
        if (!old || !old.data) {
          return {
            data: [optimisticSubcategory],
            pagination: {
              total: 1,
              totalPages: 1,
              page: 1,
              limit: 20,
              hasNext: false,
              hasPrev: false
            },
            success: true
          };
        }
        
        return {
          ...old,
          data: [optimisticSubcategory, ...old.data],
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1
          }
        };
      });
      
      // Return context for rollback
      return { 
        previousSubcategories, 
        tempId,
        optimisticSubcategory 
      };
    },
    onSuccess: (response, variables, context) => {
      console.log('[CREATE SUBCATEGORY] Success:', response.data);
      
      if (response.data.success) {
        toast.success('Subcategory created successfully');
        
        // Replace optimistic entry with real data
        if (context?.tempId && response.data.data) {
          queryClient.setQueryData(['admin', 'subcategories'], (old) => {
            if (!old || !old.data) return old;
            
            const newData = old.data.map(item => 
              item._id === context.tempId || item.__tempId === context.tempId 
                ? { ...response.data.data, __isOptimistic: false } 
                : item
            ).filter(item => !item.__isOptimistic || item._id === response.data.data._id);
            
            return {
              ...old,
              data: newData
            };
          });
        }
        
        // Invalidate and refetch after a short delay
        setTimeout(() => {
          queryClient.invalidateQueries(['admin', 'subcategories']);
          queryClient.invalidateQueries(['admin', 'dashboard']);
        }, 100);
      } else {
        toast.error(response.data.message || 'Creation failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[CREATE SUBCATEGORY ERROR]', error);
      
      // Rollback optimistic update
      if (context?.previousSubcategories) {
        queryClient.setQueryData(['admin', 'subcategories'], context.previousSubcategories);
        console.log('[CREATE SUBCATEGORY] Rolled back optimistic update');
      }
      
      // Show error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to create subcategory';
      
      // Show validation errors if they exist
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err);
        });
      } else {
        toast.error(errorMessage);
      }
    }
  });
};

export const useUpdateSubcategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('[USE UPDATE SUBCATEGORY] Updating:', { id, data });
      
      // Remove any __isOptimistic flags from data
      const cleanData = { ...data };
      delete cleanData.__isOptimistic;
      delete cleanData.__tempId;
      
      try {
        const response = await adminAPI.updateSubcategory(id, cleanData);
        console.log('[USE UPDATE SUBCATEGORY] Response:', response.data);
        return response;
      } catch (error) {
        console.error('[USE UPDATE SUBCATEGORY] Error:', error);
        throw error;
      }
    },
    onMutate: async ({ id, data }) => {
      console.log('[USE UPDATE SUBCATEGORY] Optimistic update for:', id);
      console.log('[USE UPDATE SUBCATEGORY] New data:', data);
      
      // Cancel outgoing queries
      await queryClient.cancelQueries(['admin', 'subcategories']);
      await queryClient.cancelQueries(['admin', 'subcategories', id]);
      
      // Store previous data for rollback
      const previousSubcategories = queryClient.getQueryData(['admin', 'subcategories']);
      const previousSubcategory = queryClient.getQueryData(['admin', 'subcategories', id]);
      
      console.log('[USE UPDATE SUBCATEGORY] Previous data in cache:', previousSubcategories?.data?.find(s => s._id === id));
      
      // Get current timestamp for optimistic update
      const now = new Date().toISOString();
      
      // Update cache optimistically - THIS IS WHERE THE UI SHOULD UPDATE
      queryClient.setQueryData(['admin', 'subcategories'], (old) => {
        if (!old || !old.data) return old;
        
        console.log('[USE UPDATE SUBCATEGORY] Updating cache with data:', data);
        
        return {
          ...old,
          data: old.data.map(subcategory => 
            subcategory._id === id 
              ? { 
                  ...subcategory, 
                  ...data,
                  updatedAt: now,
                  __isUpdating: true, // Mark as updating for UI feedback
                  __optimisticUpdate: true
                } 
              : subcategory
          )
        };
      });
      
      // Also update the specific subcategory cache
      queryClient.setQueryData(['admin', 'subcategories', id], (old) => {
        if (!old) return { ...data, updatedAt: now, __optimisticUpdate: true };
        return {
          ...old,
          ...data,
          updatedAt: now,
          __optimisticUpdate: true
        };
      });
      
      return { 
        previousSubcategories, 
        previousSubcategory,
        optimisticId: id 
      };
    },
    onSuccess: (response, variables, context) => {
      console.log('[USE UPDATE SUBCATEGORY] Success:', response.data);
      console.log('[USE UPDATE SUBCATEGORY] Response data:', response.data.data);
      
      if (response.data.success) {
        toast.success('Subcategory updated successfully');
        
        // Update cache with server response
        if (response.data.data) {
          console.log('[USE UPDATE SUBCATEGORY] Updating cache with server response');
          
          // Update the specific subcategory
          queryClient.setQueryData(['admin', 'subcategories', variables.id], {
            ...response.data.data,
            __isUpdating: false
          });
          
          // Update in the list
          queryClient.setQueryData(['admin', 'subcategories'], (old) => {
            if (!old || !old.data) return old;
            
            return {
              ...old,
              data: old.data.map(subcategory => 
                subcategory._id === variables.id 
                  ? { 
                      ...response.data.data,
                      __isUpdating: false,
                      __optimisticUpdate: false
                    } 
                  : subcategory
              )
            };
          });
        }
        
        // Force refresh the specific query to ensure consistency
        setTimeout(() => {
          queryClient.invalidateQueries(['admin', 'subcategories', variables.id]);
          queryClient.invalidateQueries(['admin', 'subcategories']);
        }, 100);
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[USE UPDATE SUBCATEGORY] Mutation error:', error);
      console.error('[USE UPDATE SUBCATEGORY] Error response:', error.response?.data);
      
      // Rollback optimistic update on error
      if (context?.previousSubcategories) {
        console.log('[USE UPDATE SUBCATEGORY] Rolling back list cache');
        queryClient.setQueryData(['admin', 'subcategories'], context.previousSubcategories);
      }
      
      if (context?.previousSubcategory) {
        console.log('[USE UPDATE SUBCATEGORY] Rolling back item cache');
        queryClient.setQueryData(['admin', 'subcategories', variables.id], context.previousSubcategory);
      }
      
      // Show error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to update subcategory';
      
      toast.error(errorMessage);
    }
  });
};

// Update the deleteSubcategory hook
export const useDeleteSubcategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deleteOptions) => {
      console.log('[DELETE SUBCATEGORY] Options:', deleteOptions);
      
      // Handle different parameter formats
      const { id, permanent = false, force = false } = deleteOptions;
      
      if (!id) {
        throw new Error('Subcategory ID is required');
      }
      
      const params = {
        permanent: String(permanent).toLowerCase(),
        force: String(force).toLowerCase()
      };
      
      return await adminAPI.deleteSubcategory(id, params);
    },
    onMutate: async (deleteOptions) => {
      const { id } = deleteOptions;
      
      console.log('[DELETE SUBCATEGORY] Optimistic delete for:', id);
      
      // Cancel outgoing queries
      await queryClient.cancelQueries(['admin', 'subcategories']);
      await queryClient.cancelQueries(['admin', 'subcategories', id]);
      
      // Store previous data for rollback
      const previousSubcategories = queryClient.getQueryData(['admin', 'subcategories']);
      const previousSubcategory = queryClient.getQueryData(['admin', 'subcategories', id]);
      
      // Remove from cache immediately - THIS IS KEY FOR INSTANT UI UPDATE
      queryClient.setQueryData(['admin', 'subcategories'], (old) => {
        if (!old || !old.data) return old;
        
        const newData = old.data.filter(subcategory => subcategory._id !== id);
        
        return {
          ...old,
          data: newData,
          pagination: {
            ...old.pagination,
            total: Math.max(0, old.pagination.total - 1)
          }
        };
      });
      
      // Remove specific subcategory cache
      queryClient.removeQueries(['admin', 'subcategories', id]);
      
      return { 
        previousSubcategories, 
        previousSubcategory,
        deletedId: id 
      };
    },
    onSuccess: (response, variables, context) => {
      console.log('[DELETE SUBCATEGORY] Success:', response.data);
      
      if (response.data.success) {
        const message = variables.permanent 
          ? 'Subcategory permanently deleted' 
          : 'Subcategory soft deleted successfully';
        toast.success(message);
        
        // The optimistic update already removed it, just invalidate for consistency
        setTimeout(() => {
          queryClient.invalidateQueries(['admin', 'subcategories']);
          queryClient.invalidateQueries(['admin', 'dashboard']);
        }, 100);
      } else {
        toast.error(response.data.message || 'Delete failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[DELETE SUBCATEGORY ERROR]', error);
      
      // Rollback on error - PUT IT BACK
      if (context?.previousSubcategories) {
        queryClient.setQueryData(['admin', 'subcategories'], context.previousSubcategories);
      }
      if (context?.previousSubcategory) {
        queryClient.setQueryData(['admin', 'subcategories', context.deletedId], context.previousSubcategory);
      }
      
      // Show appropriate error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to delete subcategory';
      
      toast.error(errorMessage);
    }
  });
};

// Fix the bulk operations hook too
export const useBulkSubcategoryOperations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, operation, data = {} }) => {
      console.log('[BULK SUBCATEGORY] Operation:', operation, 'IDs:', ids);
      return await adminAPI.bulkUpdateSubcategories({ ids, operation, data });
    },
    onMutate: async ({ ids, operation, data }) => {
      console.log('[BULK SUBCATEGORY] Optimistic update for:', ids);
      
      await queryClient.cancelQueries(['admin', 'subcategories']);
      
      const previousSubcategories = queryClient.getQueryData(['admin', 'subcategories']);
      
      // Optimistic update
      queryClient.setQueryData(['admin', 'subcategories'], (old) => {
        if (!old || !old.data) return old;
        
        const now = new Date().toISOString();
        return {
          ...old,
          data: old.data.map(subcategory => 
            ids.includes(subcategory._id) 
              ? { 
                  ...subcategory, 
                  ...data,
                  ...(operation === 'activate' ? { isActive: true } : {}),
                  ...(operation === 'deactivate' ? { isActive: false } : {}),
                  updatedAt: now,
                  __bulkOperation: true
                } 
              : subcategory
          )
        };
      });
      
      return { previousSubcategories };
    },
    onSuccess: (response, variables, context) => {
      console.log('[BULK SUBCATEGORY] Success:', response.data);
      
      if (response.data.success) {
        toast.success(`Successfully ${variables.operation}d ${variables.ids.length} subcategories`);
        
        // Force refetch after successful bulk operation to get accurate data
        setTimeout(() => {
          queryClient.invalidateQueries(['admin', 'subcategories']);
        }, 100);
      } else {
        toast.error(response.data.message || 'Bulk operation failed');
      }
    },
    onError: (error, variables, context) => {
      console.error('[BULK SUBCATEGORY ERROR]', error);
      
      // Rollback on error
      if (context?.previousSubcategories) {
        queryClient.setQueryData(['admin', 'subcategories'], context.previousSubcategories);
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Bulk operation failed';
      
      toast.error(errorMessage);
    }
  });
};
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

export const useRecentActivities = (limit = 10) => {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'activities', limit],
    queryFn: async () => {
      try {
        const response = await adminAPI.getRecentActivity(limit);
        return response;
      } catch (error) {
        console.error('Recent activities error:', error);
        // Return empty array on error
        return { 
          data: [],
          success: false,
          message: error.message 
        };
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
    refetchInterval: 60000, // Refetch every minute for real-time updates
    refetchOnWindowFocus: true,
    onError: (error) => {
      console.error('Failed to fetch recent activities:', error);
    }
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

// Subcategories by category hook (for separate subcategory system)
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

export const useRepairCategoryCounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminAPI.repairCategoryCounts(),
    onMutate: () => {
      toast.loading('Repairing category counts...', {
        id: 'repair-counts'
      });
    },
    onSuccess: (response) => {
      toast.dismiss('repair-counts');
      
      if (response.data.success) {
        toast.success(response.data.message || 'Category counts repaired successfully');
        
        // Invalidate and refetch all relevant queries
        queryClient.invalidateQueries(['admin', 'categories']);
        queryClient.invalidateQueries(['admin', 'dashboard']);
        queryClient.invalidateQueries(['admin', 'categories', 'stats']);
        
        const result = response.data.result;
        toast.success(`Repaired ${result.repairedCount} out of ${result.totalCategories} categories`, {
          duration: 5000
        });
      } else {
        toast.error(response.data.message || 'Repair failed');
      }
    },
    onError: (error) => {
      toast.dismiss('repair-counts');
      toast.error(error.response?.data?.message || 'Failed to repair category counts');
    }
  });
};

export const useRepairAllCounts = () => {
  const repairCategory = useRepairCategoryCounts();
  const repairSubcategory = useRepairSubcategoryCounts();

  const repairAll = async () => {
    try {
      // Repair categories first, then subcategories
      await repairCategory.mutateAsync();
      await repairSubcategory.mutateAsync();
      
      return { success: true, message: 'All counts repaired successfully' };
    } catch (error) {
      throw error;
    }
  };

  return {
    mutate: repairAll,
    isLoading: repairCategory.isLoading || repairSubcategory.isLoading,
    isError: repairCategory.isError || repairSubcategory.isError,
    error: repairCategory.error || repairSubcategory.error
  };
};