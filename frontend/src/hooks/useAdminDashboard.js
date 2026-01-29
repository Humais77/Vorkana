import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../api/admin.js';
import { useAdminStore } from '../store/useAdminStore.js';
import { toast } from 'react-hot-toast';

// CSRF Token Management
let csrfToken = localStorage.getItem('csrfToken') || null;
let csrfTokenExpiry = localStorage.getItem('csrfTokenExpiry') || 0;

const refreshCSRFToken = async () => {
  try {
    const response = await adminAPI.refreshCSRFToken();
    if (response.data.success && response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
      csrfTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      
      localStorage.setItem('csrfToken', csrfToken);
      localStorage.setItem('csrfTokenExpiry', csrfTokenExpiry.toString());
      
      return csrfToken;
    }
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error);
  }
  return null;
};

const getCSRFToken = async () => {
  // Check if token exists and is valid
  if (csrfToken && Date.now() < parseInt(csrfTokenExpiry)) {
    return csrfToken;
  }
  
  // Try to get token from server
  try {
    const response = await adminAPI.getCSRFToken();
    if (response.data.success && response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
      csrfTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
      
      localStorage.setItem('csrfToken', csrfToken);
      localStorage.setItem('csrfTokenExpiry', csrfTokenExpiry.toString());
      
      return csrfToken;
    }
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
  }
  
  return null;
};

// Enhanced API call wrapper with CSRF handling
const withCSRF = async (apiCall, retryCount = 0) => {
  try {
    const token = await getCSRFToken();
    
    // Make the API call with CSRF token
    const response = await apiCall(token);
    
    // Check if response contains a new CSRF token
    if (response.data?.csrfToken) {
      csrfToken = response.data.csrfToken;
      localStorage.setItem('csrfToken', csrfToken);
    }
    
    return response;
  } catch (error) {
    // Handle CSRF token errors specifically
    if (error.response?.status === 403 && 
        error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
      
      if (retryCount < 1) {
        // Refresh CSRF token and retry once
        console.log('CSRF token invalid, refreshing and retrying...');
        await refreshCSRFToken();
        return withCSRF(apiCall, retryCount + 1);
      }
      
      // Max retries reached, throw error
      throw new Error('CSRF token validation failed after retry');
    }
    
    throw error;
  }
};

export const useAdminDashboard = () => {
  const queryClient = useQueryClient();
  const { setDashboardStats, setSystemHealth } = useAdminStore();

  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getDashboardStats(csrfToken);
        });
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to fetch stats');
        }

        const stats = response.data.data;
        console.log('[DASHBOARD STATS] Raw data:', stats);

        // Extract safely with fallbacks using the new structure
        const overview = stats.overview || {};
        const performance = stats.performance || {};
        const calculated = stats.calculated || {};
        const recentActivity = stats.recentActivity || [];
        
        // Extract users data
        const usersData = overview.users || {};
        const userRoles = usersData.roles || {};
        
        // Extract categories data
        const categoriesData = overview.categories || {};
        
        // Extract subcategories data
        const subcategoriesData = overview.subcategories || {};
        
        // Extract services data
        const servicesData = overview.services || {};
        const servicePerformance = performance.services || {};
        
        // Extract gigs data
        const gigsData = overview.gigs || {};
        const gigPerformance = performance.gigs || {};
        
        // Platform performance
        const platformPerformance = performance.platform || {};

        const dashboardData = {
          // Users stats
          totalUsers: usersData.total || 0,
          activeUsers: usersData.active || 0,
          verifiedUsers: usersData.verified || 0,
          pendingUsers: usersData.pending || 0,
          newLast7d: usersData.newLast7d || 0,
          adminCount: userRoles.admins || 0,
          sellerCount: userRoles.sellers || 0,
          
          // Categories stats
          totalCategories: categoriesData.total || 0,
          activeCategories: categoriesData.active || 0,
          featuredCategories: categoriesData.featured || 0,
          popularCategories: categoriesData.popular || 0,
          
          // Subcategories stats
          totalSubcategories: subcategoriesData.total || 0,
          activeSubcategories: subcategoriesData.active || 0,
          
          // Services stats
          totalServices: servicesData.total || 0,
          activeServices: servicesData.active || 0,
          draftServices: servicesData.draft || 0,
          pendingServices: servicesData.pending || 0,
          suspendedServices: servicesData.suspended || 0,
          featuredServices: servicesData.featured || 0,
          recommendedServices: servicesData.recommended || 0,
          avgServicePrice: servicePerformance.avgPrice || 0,
          avgServiceRating: servicePerformance.avgRating || 0,
          avgDeliveryTime: servicePerformance.avgDeliveryTime || 0,
          serviceViews: servicePerformance.totalViews || 0,
          serviceLikes: servicePerformance.totalLikes || 0,
          
          // Gigs stats
          totalGigs: gigsData.total || 0,
          openGigs: gigsData.open || 0,
          inProgressGigs: gigsData.inProgress || 0,
          assignedGigs: gigsData.assigned || 0,
          completedGigs: gigsData.completed || 0,
          cancelledGigs: gigsData.cancelled || 0,
          avgTimeline: gigPerformance.avgTimeline || 0,
          
          // Platform stats
          activeUsers30d: platformPerformance.activeUsers30d || 0,
          newServices30d: platformPerformance.newServices30d || 0,
          newGigs30d: platformPerformance.newGigs30d || 0,
          avgServiceRatingPlatform: platformPerformance.avgServiceRating || 0,
          
          // Calculated metrics
          conversionRate: calculated.conversionRate || 0,
          serviceCompletionRate: calculated.serviceCompletionRate || 0,
          gigCompletionRate: calculated.gigCompletionRate || 0,
          contentDensity: calculated.contentDensity || 0,
          
          // Raw data for other components
          insights: stats.insights || {},
          trends: stats.trends || {},
          geography: stats.geography || {},
          recentActivity: recentActivity,
          
          lastUpdated: stats.meta?.timestamp || new Date().toISOString()
        };

        console.log('[DASHBOARD STATS] Processed for store:', dashboardData);

        // Update Zustand store
        setDashboardStats(dashboardData);

        // Return full stats for components that need it
        return {
          success: true,
          data: dashboardData,
          fullStats: stats,
          csrfToken: response.data.csrfToken
        };
      } catch (error) {
        console.error('Dashboard fetch error:', error);

        // Check if it's an authentication error
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/';
          throw error;
        }

        // Fallback: zero everything
        const fallback = {
          totalUsers: 0,
          activeUsers: 0,
          verifiedUsers: 0,
          pendingUsers: 0,
          newLast7d: 0,
          adminCount: 0,
          sellerCount: 0,
          
          totalCategories: 0,
          activeCategories: 0,
          featuredCategories: 0,
          popularCategories: 0,
          
          totalSubcategories: 0,
          activeSubcategories: 0,
          
          totalServices: 0,
          activeServices: 0,
          draftServices: 0,
          pendingServices: 0,
          suspendedServices: 0,
          featuredServices: 0,
          recommendedServices: 0,
          avgServicePrice: 0,
          avgServiceRating: 0,
          avgDeliveryTime: 0,
          serviceViews: 0,
          serviceLikes: 0,
          
          totalGigs: 0,
          openGigs: 0,
          inProgressGigs: 0,
          assignedGigs: 0,
          completedGigs: 0,
          cancelledGigs: 0,
          avgTimeline: 0,
          
          activeUsers30d: 0,
          newServices30d: 0,
          newGigs30d: 0,
          avgServiceRatingPlatform: 0,
          
          conversionRate: 0,
          serviceCompletionRate: 0,
          gigCompletionRate: 0,
          contentDensity: 0,
          
          insights: {},
          trends: {},
          geography: {},
          recentActivity: [],
          
          lastUpdated: new Date().toISOString()
        };

        setDashboardStats(fallback);

        toast.error('Failed to load dashboard stats');
        return {
          success: false,
          data: fallback,
          error: error.message
        };
      }
    },
    staleTime: 60000,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    onError: (error) => {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error('Dashboard loading failed');
      }
    }
  });
};

export const useAdminUsers = (params = {}) => {
  const setUsers = useAdminStore((state) => state.setUsers);

  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getUsers(params, csrfToken);
        });
        
        if (response.data.success) {
          setUsers(response.data);
          return {
            ...response.data,
            csrfToken: response.data.csrfToken
          };
        }
        throw new Error(response.data.message || 'Failed to fetch users');
      } catch (error) {
        console.error('Users error:', error);
        throw error;
      }
    },
    staleTime: 60000,
    retry: (failureCount, error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    keepPreviousData: true,
    onError: (error) => {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
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
        const response = await withCSRF(async (csrfToken) => {
          // Add default admin parameters
          const queryParams = {
            ...params,
            showAll: true,
            isAdmin: true,
            populate: true
          };
          
          return await adminAPI.getCategories(queryParams, csrfToken);
        });
        
        console.log('[FETCH CATEGORIES] Response success:', response.data?.success);
        
        if (response.data.success) {
          setCategories(response.data);
          return {
            ...response.data,
            csrfToken: response.data.csrfToken
          };
        }
        
        throw new Error(response.data.message || 'Failed to fetch categories');
      } catch (error) {
        console.error('[FETCH CATEGORIES ERROR]', error);
        throw error;
      }
    },
    staleTime: 30000,
    gcTime: 60000,
    retry: (failureCount, error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
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
    mutationFn: async (userData) => {
      return await withCSRF(async (csrfToken) => {
        return await adminAPI.createUser(userData, csrfToken);
      });
    },
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
      
      return await withCSRF(async (csrfToken) => {
        return await adminAPI.deleteUser(id, options, csrfToken);
      });
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
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.updateUser(id, data, csrfToken);
        });
        
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
      
      const response = await withCSRF(async (csrfToken) => {
        return await adminAPI.createCategory(categoryData, csrfToken);
      });
      
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

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('[UPDATE CATEGORY] Updating:', { id, data });
      
      // Remove any __isOptimistic flags from data
      const cleanData = { ...data };
      delete cleanData.__isOptimistic;
      
      const response = await withCSRF(async (csrfToken) => {
        return await adminAPI.updateCategory(id, cleanData, csrfToken);
      });
      
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
      
      return await withCSRF(async (csrfToken) => {
        return await adminAPI.deleteCategory(id, params, csrfToken);
      });
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
      
      return await withCSRF(async (csrfToken) => {
        return await adminAPI.restoreCategory(categoryId, csrfToken);
      });
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

export const useBulkRestoreCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids) => withCSRF(async (csrfToken) => {
      return await adminAPI.bulkRestoreCategories(ids, csrfToken);
    }),
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
        const response = await withCSRF(async (csrfToken) => {
          // Always include full details for admin
          return await adminAPI.getServices({
            ...params,
            includeFullDetails: true,
            populateSubcategories: true
          }, csrfToken);
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
    staleTime: 30000,
    retry: (failureCount, error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    keepPreviousData: true,
    onError: (error) => {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
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
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.restoreService(id, data, csrfToken);
        });
        
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

export const useBulkRestoreServices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids) => withCSRF(async (csrfToken) => {
      return await adminAPI.bulkRestoreServices(ids, csrfToken);
    }),
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

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('[USE UPDATE SERVICE] Updating service:', { id, data });
      
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.updateService(id, data, csrfToken);
        });
        
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
      
      return await withCSRF(async (csrfToken) => {
        return await adminAPI.deleteService(id, options, csrfToken);
      });
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
      withCSRF(async (csrfToken) => {
        return await adminAPI.bulkUpdateServices({ ids, operation, data }, csrfToken);
      }),
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

export const useCategoriesForDropdown = (includeSubcategories = true) => {
  return useQuery({
    queryKey: ['admin', 'categories', 'dropdown', includeSubcategories],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getCategoriesForDropdown(includeSubcategories, csrfToken);
        });
        
        console.log('[CATEGORIES DROPDOWN] Response:', response);
        console.log('[CATEGORIES DROPDOWN] Response data:', response.data);
        
        // Ensure data structure is consistent
        if (response.data?.success) {
          const data = response.data.data || [];
          console.log('[CATEGORIES DROPDOWN] Processed data:', data);
          console.log('[CATEGORIES DROPDOWN] First category:', data[0]);
          return {
            success: true,
            data: data,
            count: response.data.count || data.length || 0
          };
        }
        
        return { 
          success: false, 
          data: [], 
          count: 0,
          message: 'No data returned'
        };
      } catch (error) {
        console.error('[CATEGORIES DROPDOWN] Error:', error);
        console.error('[CATEGORIES DROPDOWN] Error response:', error.response);
        return { 
          success: false, 
          data: [], 
          count: 0,
          error: error.message 
        };
      }
    },
    staleTime: 300000,
    enabled: true,
    retry: 3,
    onError: (error) => {
      console.error('[CATEGORIES DROPDOWN] Query error:', error);
    }
  });
};

export const useUsersForDropdown = (role = '') => {
  return useQuery({
    queryKey: ['admin', 'users', 'dropdown', role],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getUsersForDropdown(role, csrfToken);
        });
        
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
      return await withCSRF(async (csrfToken) => {
        return await adminAPI.bulkUpdateCategories({ ids, operation, data }, csrfToken);
      });
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
    mutationFn: (formData) => withCSRF(async (csrfToken) => {
      return await adminApi.post('/api/services/admin/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-CSRF-Token': csrfToken
        }
      });
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
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getServiceStats(csrfToken);
        });
        
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
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getSubcategories(params, csrfToken);
        });
        
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
      if (error.response?.status !== 401 && error.response?.status !== 403) {
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
      
      const response = await withCSRF(async (csrfToken) => {
        return await adminAPI.createSubcategory(subcategoryData, csrfToken);
      });
      
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
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.updateSubcategory(id, cleanData, csrfToken);
        });
        
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
      
      return await withCSRF(async (csrfToken) => {
        return await adminAPI.deleteSubcategory(id, params, csrfToken);
      });
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

export const useBulkSubcategoryOperations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, operation, data = {} }) => {
      console.log('[BULK SUBCATEGORY] Operation:', operation, 'IDs:', ids);
      return await withCSRF(async (csrfToken) => {
        return await adminAPI.bulkUpdateSubcategories({ ids, operation, data }, csrfToken);
      });
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
      withCSRF(async (csrfToken) => {
        return await adminAPI.bulkUpdateUsers({ ids, operation, data }, csrfToken);
      }),
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
    mutationFn: (format = 'csv') => withCSRF(async (csrfToken) => {
      return await adminAPI.exportUsers(format, csrfToken);
    }),
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
    mutationFn: (format = 'csv') => withCSRF(async (csrfToken) => {
      return await adminAPI.exportCategories(format, csrfToken);
    }),
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
    mutationFn: (format = 'csv') => withCSRF(async (csrfToken) => {
      return await adminAPI.exportSubcategories(format, csrfToken);
    }),
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
    mutationFn: (format = 'csv') => withCSRF(async (csrfToken) => {
      return await adminAPI.exportServices(format, csrfToken);
    }),
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
    mutationFn: (format = 'csv') => withCSRF(async (csrfToken) => {
      return await adminAPI.exportGigs(format, csrfToken);
    }),
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
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getCategoryStats(csrfToken);
        });
        
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
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getSubcategoryStats(csrfToken);
        });
        
        if (response.data.success) {
          const statsData = response.data.data;
          console.log('[SUBCATEGORY STATS] Backend data:', statsData);
          
          // Extract overview - it could be an array or object
          let overview = {};
          if (Array.isArray(statsData.overview)) {
            overview = statsData.overview[0] || {};
          } else if (typeof statsData.overview === 'object') {
            overview = statsData.overview;
          }
          
          return {
            success: true,
            data: {
              overview: {
                totalSubcategories: overview.totalSubcategories || 0,
                activeSubcategories: overview.activeSubcategories || 0,
                totalServices: Math.max(0, overview.totalServices || 0),
                totalGigs: Math.max(0, overview.totalGigs || 0),
                avgServices: Math.max(0, overview.avgServices || 0),
                avgGigs: Math.max(0, overview.avgGigs || 0)
              },
              byCategory: statsData.byCategory || [],
              growth: statsData.growth || []
            }
          };
        }
        throw new Error(response.data.message || 'Failed to fetch stats');
      } catch (error) {
        console.error('[SUBCATEGORY STATS ERROR]', error);
        // Return fallback data
        return {
          success: false,
          data: {
            overview: {
              totalSubcategories: 0,
              activeSubcategories: 0,
              totalServices: 0,
              totalGigs: 0,
              avgServices: 0,
              avgGigs: 0
            },
            byCategory: [],
            growth: []
          },
          error: error.message
        };
      }
    },
    staleTime: 30000,
    retry: 2,
    // Transform the data to ensure all numbers are positive
    select: (data) => {
      if (!data || !data.data) return data;
      
      const processedData = { ...data.data };
      
      // Ensure overview numbers are positive
      if (processedData.overview) {
        Object.keys(processedData.overview).forEach(key => {
          if (typeof processedData.overview[key] === 'number') {
            processedData.overview[key] = Math.max(0, processedData.overview[key]);
          }
        });
      }
      
      return {
        ...data,
        data: processedData
      };
    }
  });
};

export const useSystemHealth = () => {
  const { setSystemHealth } = useAdminStore();

  return useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getSystemHealth(csrfToken);
        });
        
        if (response.data.success) {
          const healthData = response.data.data || {};
          
          // Update store
          setSystemHealth({
            status: healthData.status || 'unknown',
            timestamp: healthData.timestamp,
            uptime: healthData.uptime || 0,
            database: healthData.database || 'unknown',
            responseTime: healthData.responseTime || '0ms',
            memory: healthData.memory || {},
            version: healthData.version || 'unknown',
            platform: healthData.platform || 'unknown'
          });
          
          return response.data;
        }
        throw new Error(response.data.message || 'Failed to fetch system health');
      } catch (error) {
        console.error('System health error:', error);
        
        // Set fallback
        setSystemHealth({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: 0,
          database: 'disconnected',
          responseTime: 'error',
          memory: {},
          version: 'unknown',
          platform: 'unknown'
        });
        
        return {
          success: false,
          data: {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
          }
        };
      }
    },
    staleTime: 10000,
    retry: 1,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    onError: (error) => {
      console.error('Failed to fetch system health:', error);
    }
  });
};

export const useRecentActivities = (limit = 10) => {
  const { dashboardStats } = useAdminStore();

  return useQuery({
    queryKey: ['admin', 'dashboard', 'activities', limit],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getRecentActivity(limit, csrfToken);
        });
        
        // FIX: Check if response exists before accessing success
        if (response && response.data && response.data.success) {
          const activities = response.data.data || [];
          
          // Process activities for display
          const processedActivities = activities.map(activity => {
            const baseActivity = {
              id: activity.id,
              type: activity.type,
              title: activity.title,
              description: activity.description,
              timestamp: activity.timestamp,
              isoTimestamp: activity.isoTimestamp
            };
            
            // Format for UI display
            if (activity.type === 'USER') {
              return {
                ...baseActivity,
                name: activity.user?.name || 'User',
                email: activity.user?.email || 'No email',
                picture: activity.user?.picture || null,
                role: activity.user?.role || 'user',
                status: activity.status || 'active',
                isActive: activity.status === 'active',
                joined: activity.timestamp
              };
            }
            
            return baseActivity;
          });
          
          return {
            success: true,
            data: processedActivities,
            count: activities.length
          };
        }
        
        // Fallback to store data if API fails
        const fallbackActivities = dashboardStats.recentActivity || [];
        return {
          success: false,
          data: fallbackActivities.slice(0, limit),
          count: fallbackActivities.length,
          message: 'Using cached data'
        };
      } catch (error) {
        console.error('Recent activities error:', error);
        
        // Use store data as fallback
        const fallbackActivities = dashboardStats.recentActivity || [];
        return {
          success: false,
          data: fallbackActivities.slice(0, limit),
          count: fallbackActivities.length,
          error: error.message
        };
      }
    },
    staleTime: 30000,
    retry: 1,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    enabled: true,
    onError: (error) => {
      console.error('Failed to fetch recent activities:', error);
    }
  });
};

export const usePlatformMetrics = () => {
  return useQuery({
    queryKey: ['admin', 'platform', 'metrics'],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getDashboardStats(csrfToken);
        });
        
        if (response.data.success) {
          const stats = response.data.data;
          const performance = stats.performance || {};
          const calculated = stats.calculated || {};
          
          return {
            success: true,
            data: {
              // Performance metrics
              avgServiceRating: performance.services?.avgRating || 0,
              avgDeliveryTime: performance.services?.avgDeliveryTime || 0,
              serviceViews: performance.services?.totalViews || 0,
              serviceLikes: performance.services?.totalLikes || 0,
              
              // Platform metrics
              activeUsers30d: performance.platform?.activeUsers30d || 0,
              newServices30d: performance.platform?.newServices30d || 0,
              newGigs30d: performance.platform?.newGigs30d || 0,
              
              // Calculated metrics
              conversionRate: calculated.conversionRate || 0,
              serviceCompletionRate: calculated.serviceCompletionRate || 0,
              gigCompletionRate: calculated.gigCompletionRate || 0,
              contentDensity: calculated.contentDensity || 0,
              
              // Growth metrics (from trends)
              userGrowth: stats.trends?.userGrowth?.length || 0,
              serviceGrowth: stats.trends?.serviceGrowth?.length || 0,
              gigGrowth: stats.trends?.gigGrowth?.length || 0
            }
          };
        }
        throw new Error('Failed to fetch platform metrics');
      } catch (error) {
        console.error('Platform metrics error:', error);
        return {
          success: false,
          data: {
            avgServiceRating: 0,
            avgDeliveryTime: 0,
            serviceViews: 0,
            serviceLikes: 0,
            activeUsers30d: 0,
            newServices30d: 0,
            newGigs30d: 0,
            conversionRate: 0,
            serviceCompletionRate: 0,
            gigCompletionRate: 0,
            contentDensity: 0,
            userGrowth: 0,
            serviceGrowth: 0,
            gigGrowth: 0
          }
        };
      }
    },
    staleTime: 60000,
    retry: 2
  });
};

export const useCategoryDistribution = () => {
  const { dashboardStats } = useAdminStore();

  return useQuery({
    queryKey: ['admin', 'categories', 'distribution'],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getCategoryStats(csrfToken);
        });
        
        if (response.data.success) {
          const stats = response.data.data;
          
          // Calculate percentages for pie chart
          const topCategories = stats.overview?.topCategories || [];
          const total = topCategories.reduce((sum, cat) => sum + (cat.count || 0), 0);
          
          const distribution = topCategories.map(cat => ({
            name: cat.category?.name || 'Unknown',
            value: cat.count || 0,
            percentage: total > 0 ? Math.round((cat.count / total) * 100) : 0
          }));
          
          return {
            success: true,
            data: distribution,
            totalCategories: stats.overview?.totalCategories || 0
          };
        }
        
        // Fallback using dashboard stats
        return {
          success: false,
          data: [
            { name: 'Categories', value: dashboardStats.totalCategories || 0, percentage: 100 },
            { name: 'Subcategories', value: dashboardStats.totalSubcategories || 0, percentage: 100 }
          ],
          totalCategories: dashboardStats.totalCategories || 0
        };
      } catch (error) {
        console.error('Category distribution error:', error);
        return {
          success: false,
          data: [],
          totalCategories: 0
        };
      }
    },
    staleTime: 120000,
    retry: 1
  });
};

export const useRefreshDashboard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => {
      return queryClient.invalidateQueries(['admin', 'dashboard']);
    },
    onMutate: () => {
      toast.loading('Refreshing dashboard...', { id: 'refresh-dashboard' });
    },
    onSuccess: () => {
      toast.dismiss('refresh-dashboard');
      toast.success('Dashboard refreshed successfully');
    },
    onError: (error) => {
      toast.dismiss('refresh-dashboard');
      toast.error('Failed to refresh dashboard');
    }
  });
};

export const useChartData = (chartType, timeRange = '7d') => {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'charts', chartType, timeRange],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getChartData(chartType, timeRange, csrfToken);
        });
        
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

export const useSubcategoriesByCategory = (categoryId, params = {}) => {
  return useQuery({
    queryKey: ['admin', 'subcategories', 'dropdown', categoryId, params],
    queryFn: async () => {
      try {
        console.log('[HOOK DEBUG] Fetching subcategories for category:', categoryId);
        
        if (!categoryId) {
          console.log('[HOOK DEBUG] No category ID provided, returning empty');
          return { success: true, data: [], count: 0 };
        }
        
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getSubcategoriesDropdown(categoryId, params, csrfToken);
        });
        
        console.log('[HOOK DEBUG] API Response:', response);
        
        // Check response structure
        if (response.data) {
          console.log('[HOOK DEBUG] Response data structure:', {
            hasData: !!response.data.data,
            isArray: Array.isArray(response.data.data),
            data: response.data.data
          });
        }
        
        return response.data;
      } catch (error) {
        console.error('[HOOK DEBUG] Subcategories by category error:', error);
        console.error('[HOOK DEBUG] Error response:', error.response?.data);
        return { 
          success: false, 
          data: [], 
          count: 0,
          error: error.message 
        };
      }
    },
    enabled: !!categoryId,
    staleTime: 300000,
  });
};

export const useRepairCategoryCounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => withCSRF(async (csrfToken) => {
      return await adminAPI.repairCategoryCounts(csrfToken);
    }),
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

// Additional production-ready hooks
export const useAdminAuth = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials) => {
      return await adminAPI.adminLogin(credentials);
    },
    onSuccess: (response) => {
      if (response.data.success) {
        // Store admin token
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminRefreshToken', response.data.refreshToken);
        localStorage.setItem('adminCsrfToken', response.data.csrfToken);
        
        toast.success('Admin login successful');
        
        // Invalidate all admin queries
        queryClient.invalidateQueries(['admin']);
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  });
};



export const useAdminPermissions = () => {
  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      try {
        const response = await withCSRF(async (csrfToken) => {
          return await adminAPI.getPermissions(csrfToken);
        });
        
        return response.data;
      } catch (error) {
        console.error('Permissions error:', error);
        return { 
          success: false, 
          data: [],
          error: error.message 
        };
      }
    },
    staleTime: 300000,
  });
};

// Error boundary and retry configuration
const defaultQueryOptions = {
  staleTime: 30000,
  gcTime: 60000,
  retry: (failureCount, error) => {
    // Don't retry on authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      return false;
    }
    // Retry up to 3 times for other errors
    return failureCount < 3;
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

// Export CSRF utilities for use in other components
export const csrf = {
  getToken: getCSRFToken,
  refreshToken: refreshCSRFToken,
  clearToken: () => {
    csrfToken = null;
    csrfTokenExpiry = 0;
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('csrfTokenExpiry');
  }
};