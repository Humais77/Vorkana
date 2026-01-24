// useService.js - Production-ready with CSRF protection
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { servicesAPI } from '../api/services.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCSRF } from './useAuth.js';

// Import the axios instance from services.js
import { axiosInstance } from '../api/services.js';

// Query keys
export const serviceKeys = {
  all: ['services'],
  lists: () => [...serviceKeys.all, 'list'],
  list: (filters) => [...serviceKeys.lists(), filters],
  details: () => [...serviceKeys.all, 'detail'],
  detail: (id) => [...serviceKeys.details(), id],
  myServices: () => [...serviceKeys.all, 'my-services'],
  stats: () => [...serviceKeys.all, 'stats'],
  popular: () => [...serviceKeys.all, 'popular'],
  search: (params) => [...serviceKeys.all, 'search', params],
  byCategory: (categoryId, params) => [...serviceKeys.all, 'category', categoryId, params],
  bySubcategory: (subcategoryId, params) => [...serviceKeys.all, 'subcategory', subcategoryId, params],
  bySubcategorySlug: (subcategorySlug, params) => [...serviceKeys.all, 'subcategory-slug', subcategorySlug, params],
  similar: (serviceId, params) => [...serviceKeys.all, 'similar', serviceId, params],
  images: (serviceId) => [...serviceKeys.detail(serviceId), 'images'],
  thumbnail: (serviceId) => [...serviceKeys.detail(serviceId), 'thumbnail'],
  admin: () => [...serviceKeys.all, 'admin'],
  adminList: (filters) => [...serviceKeys.admin(), 'list', filters],
  categories: () => [...serviceKeys.all, 'categories'],
};

// Helper function to extract services from response
export const extractServicesFromResponse = (response) => {
  if (!response) return [];
  
  if (Array.isArray(response)) {
    return response;
  }
  
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  if (response.services && Array.isArray(response.services)) {
    return response.services;
  }
  
  if (response.success && response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  return [];
};

// Helper to handle CSRF errors
const handleCSRFError = (error, retryAction = null) => {
  if (error.code === 'CSRF_TOKEN_INVALID' || error.requiresCSRFRefresh) {
    toast.error('Security session expired. Refreshing...');
    
    // Try to refresh CSRF token
    servicesAPI.refreshCSRFToken?.().then(() => {
      toast.success('Security session refreshed. Please try again.');
      if (retryAction) retryAction();
    }).catch(() => {
      toast.error('Please refresh the page and try again.');
    });
    
    return true;
  }
  return false;
};

// Main service query hooks
export const useMyServices = (filters = {}) => {
  const { user } = useAuthStore();
  const { validate: validateCSRF } = useCSRF();
  
  return useQuery({
    queryKey: serviceKeys.myServices(filters),
    queryFn: async () => {
      if (!user?._id) {
        throw new Error('Please login to view your services');
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      try {
        const result = await servicesAPI.getMyServices(filters);
        return result;
      } catch (error) {
        return {
          success: false,
          data: [],
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: 0,
            totalPages: 0
          },
          error: error.message
        };
      }
    },
    enabled: !!user?._id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 1;
    },
    onError: (error) => {
      if (!handleCSRFError(error)) {
        console.error('useMyServices error:', error);
        if (!error.message.includes('Please login')) {
          toast.error(error.message || 'Failed to load your services');
        }
      }
    },
  });
};

export const useServices = (filters = {}) => {
  return useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: async () => {
      try {
        const result = await servicesAPI.getAll(filters);
        return result;
      } catch (error) {
        return {
          success: false,
          data: [],
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 12,
            total: 0,
            totalPages: 0
          },
          error: error.message
        };
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 1;
    },
    onError: (error) => {
      if (!handleCSRFError(error)) {
        console.error('useServices error:', error);
        if (process.env.NODE_ENV === 'development') {
          toast.error(error.message || 'Failed to load services');
        }
      }
    },
  });
};

export const useService = (identifier) => {
  return useQuery({
    queryKey: serviceKeys.detail(identifier),
    queryFn: () => servicesAPI.getById(identifier),
    enabled: !!identifier,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'SERVICE_NOT_FOUND') return false;
      return failureCount < 2;
    },
    onSuccess: (data) => {
      // Ensure version field is included
      if (data?.service) {
        data.service.version = data.service.version || 1;
      } else if (data?.data) {
        data.data.version = data.data.version || 1;
      }
    },
    onError: (error) => {
      if (!handleCSRFError(error)) {
        toast.error(error.message || 'Failed to load service');
      }
    },
  });
};

export const usePopularServices = (params = {}) => {
  return useQuery({
    queryKey: serviceKeys.popular(params),
    queryFn: async () => {
      try {
        const result = await servicesAPI.getPopularServices(params);
        return result;
      } catch (error) {
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 1;
    },
    onError: (error) => {
      if (!handleCSRFError(error)) {
        console.error('Failed to load popular services:', error);
      }
    },
  });
};

export const useServicesByCategory = (categoryId, subcategoryId = null, options = {}) => {
  return useQuery({
    queryKey: serviceKeys.byCategory(categoryId, { subcategoryId }),
    queryFn: async () => {
      if (!categoryId) return [];
      
      try {
        const result = await servicesAPI.getAll({
          category: categoryId,
          subcategory: subcategoryId,
          status: 'active',
          limit: 50
        });
        
        if (result?.success) {
          return result.data || [];
        }
        return result || [];
      } catch (error) {
        console.error('Error fetching services by category:', error);
        return [];
      }
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useServicesBySubcategory = (subcategorySlug, options = {}) => {
  return useQuery({
    queryKey: serviceKeys.bySubcategorySlug(subcategorySlug),
    queryFn: async () => {
      if (!subcategorySlug) return [];
      
      try {
        const result = await servicesAPI.getAll({
          subcategorySlug: subcategorySlug,
          status: 'active',
          limit: 50
        });
        
        if (result?.success) {
          return result.data || [];
        }
        return result || [];
      } catch (error) {
        console.error('Error fetching services by subcategory:', error);
        return [];
      }
    },
    enabled: !!subcategorySlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const usePopularServicesByCategory = (params = {}) => {
  return useQuery({
    queryKey: ['popularServicesByCategory', params],
    queryFn: async () => {
      try {
        const result = await servicesAPI.getPopularServicesByCategory(params);
        return result;
      } catch (error) {
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 1;
    },
  });
};

// Mutation hooks with CSRF protection
export const useTogglePopularStatus = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ serviceId, isPopular }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return servicesAPI.togglePopularStatus(serviceId, isPopular);
    },
    onMutate: () => {
      toast.loading('Updating popular status...');
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(serviceKeys.popular());
        queryClient.invalidateQueries(['popularServicesByCategory']);
        queryClient.invalidateQueries(serviceKeys.detail(variables.serviceId));
        queryClient.invalidateQueries(serviceKeys.myServices());
        queryClient.invalidateQueries(serviceKeys.lists());
        
        toast.success(data.message || `Service ${variables.isPopular ? 'marked as popular' : 'removed from popular'} successfully!`);
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Failed to update popular status');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: serviceKeys.categories(),
    queryFn: async () => {
      try {
        const categories = await servicesAPI.getCategories();
        return categories;
      } catch (error) {
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async (formData) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      if (formData instanceof FormData) {
        return servicesAPI.create({}, formData);
      }
      
      const { serviceData, files = null } = formData || {};
      return servicesAPI.create(serviceData, files);
    },
    onMutate: async (newService) => {
      await queryClient.cancelQueries({ queryKey: serviceKeys.myServices() });
      
      const previousServices = queryClient.getQueryData(serviceKeys.myServices());
      
      // Optimistically update
      queryClient.setQueryData(serviceKeys.myServices(), (old) => {
        const oldData = Array.isArray(old) ? old : (old?.data || []);
        return {
          ...old,
          data: [
            {
              _id: 'temp_' + Date.now(),
              ...(newService.serviceData || newService),
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              __optimistic: true
            },
            ...oldData
          ]
        };
      });
      
      return { previousServices };
    },
    onSuccess: (data) => {
      if (data.success) {
        // Force immediate cache update
        queryClient.setQueryData(serviceKeys.myServices(), (old) => {
          const oldData = Array.isArray(old) ? old : (old?.data || []);
          // Replace optimistic entry with real data
          const filtered = oldData.filter(item => !item.__optimistic);
          return {
            ...old,
            data: [data.data || data.service, ...filtered]
          };
        });
        
        queryClient.invalidateQueries(serviceKeys.myServices());
        queryClient.invalidateQueries(serviceKeys.lists());
        
        // Set refresh flag
        sessionStorage.setItem('refreshDashboard', 'true');
        
        navigate('/profile?tab=services');
        toast.success(data.message || 'Service created successfully!');
      } else {
        throw new Error(data.message || 'Failed to create service');
      }
    },
    onError: (error, newService, context) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      // Rollback
      if (context?.previousServices) {
        queryClient.setQueryData(serviceKeys.myServices(), context.previousServices);
      }
      toast.error(error.message || 'Failed to create service');
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ id, data, headers, version }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      try {
        // If version is provided, add it to the data
        if (version !== undefined) {
          if (data instanceof FormData) {
            data.append('version', version.toString());
            // Add CSRF token to FormData
            const csrfToken = localStorage.getItem('csrfToken');
            if (csrfToken) {
              data.append('csrfToken', csrfToken);
            }
          } else if (typeof data === 'object') {
            data.version = version;
            // Add CSRF token to JSON data
            const csrfToken = localStorage.getItem('csrfToken');
            if (csrfToken) {
              data.csrfToken = csrfToken;
            }
          }
        }
        
        const response = await axiosInstance.put(`/api/services/${id}`, data, {
          headers: headers || {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        });
        
        if (!response.data.success) {
          // Handle version conflict specifically
          if (response.data.code === 'VERSION_CONFLICT') {
            throw {
              message: response.data.message,
              code: 'VERSION_CONFLICT',
              currentVersion: response.data.currentVersion,
              status: 409
            };
          }
          throw new Error(response.data.message || 'Update failed');
        }
        
        return response.data;
      } catch (error) {
        // Handle CSRF errors
        if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
          throw {
            message: 'Security validation failed. Please refresh the page.',
            code: 'CSRF_TOKEN_INVALID',
            status: 403,
            requiresCSRFRefresh: true
          };
        }
        
        // Handle version conflict from backend
        if (error.response?.status === 409 || error.code === 'VERSION_CONFLICT') {
          const errorData = error.response?.data;
          throw {
            message: errorData?.message || 'Service was modified by another user',
            code: 'VERSION_CONFLICT',
            currentVersion: errorData?.currentVersion || error.currentVersion,
            status: 409
          };
        }
        
        // Handle other errors
        if (error.response?.status === 400) {
          const errorData = error.response.data;
          const errorMessage = errorData.errors?.join(', ') || errorData.message;
          throw new Error(errorMessage || 'Validation failed');
        }
        
        if (error.response?.status === 401) {
          throw new Error('Please login to update services');
        }
        
        if (error.response?.status === 403) {
          throw new Error('You can only update your own services');
        }
        
        if (error.response?.status === 404) {
          throw new Error('Service not found');
        }
        
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please try again.');
        }
        
        throw error;
      }
    },
    onMutate: async ({ id, data, version }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: serviceKeys.detail(id) });
      
      // Snapshot the previous value
      const previousService = queryClient.getQueryData(serviceKeys.detail(id));
      
      // Optimistically update the service with the new version
      if (previousService) {
        const newVersion = version ? version + 1 : (previousService.version || 1) + 1;
        
        queryClient.setQueryData(serviceKeys.detail(id), (old) => {
          if (!old) return old;
          
          // Create optimistic update
          const updatedService = {
            ...old,
            ...old.service,
            ...old.data,
            version: newVersion,
            updatedAt: new Date().toISOString(),
            __optimistic: true
          };
          
          // If it's a service object from getServiceById response
          if (old.service) {
            return {
              ...old,
              service: updatedService,
              data: updatedService
            };
          }
          
          return updatedService;
        });
      }
      
      return { previousService };
    },
    onSuccess: (data, variables) => {
      // Update the service cache with real data from server
      if (data.service || data.data) {
        const updatedService = data.service || data.data;
        
        // Remove optimistic flag
        delete updatedService.__optimistic;
        
        queryClient.setQueryData(serviceKeys.detail(variables.id), (old) => {
          if (!old) return old;
          
          // If it's a service object from getServiceById response
          if (old.service) {
            return {
              ...old,
              service: updatedService,
              data: updatedService,
              success: true,
              message: data.message
            };
          }
          
          return updatedService;
        });
      }
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.id),
        refetchType: 'none'
      });
      
      queryClient.invalidateQueries({
        queryKey: serviceKeys.myServices()
      });
      
      queryClient.invalidateQueries({
        queryKey: serviceKeys.lists()
      });
      
      queryClient.invalidateQueries({
        queryKey: serviceKeys.popular()
      });
      
      queryClient.invalidateQueries({
        queryKey: ['popularServicesByCategory']
      });
      
      toast.success(data.message || 'Service updated successfully!');
    },
    onError: (error, variables, context) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      // Rollback on error
      if (context?.previousService) {
        queryClient.setQueryData(serviceKeys.detail(variables.id), context.previousService);
      }
      
      // If version conflict, invalidate the query to get fresh data
      if (error.code === 'VERSION_CONFLICT') {
        queryClient.invalidateQueries({ 
          queryKey: serviceKeys.detail(variables.id) 
        });
        toast.error('This service was modified by another user. Please refresh and try again.');
      } else {
        toast.error(error.message || 'Failed to update service');
      }
    },
    // Add onSettled to ensure fresh data
    onSettled: (data, error, variables) => {
      // Force a fresh fetch to ensure data consistency after settle
      if (error?.code === 'VERSION_CONFLICT') {
        queryClient.invalidateQueries({ 
          queryKey: serviceKeys.detail(variables.id) 
        });
      }
    }
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ id, options = {} }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return servicesAPI.delete(id, options);
    },
    onMutate: () => {
      toast.loading('Deleting service...');
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(serviceKeys.myServices());
        queryClient.invalidateQueries(serviceKeys.lists());
        toast.success(data.message || 'Service deleted successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Failed to delete service');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useServiceStats = (filters = {}) => {
  return useQuery({
    queryKey: serviceKeys.stats(filters),
    queryFn: () => servicesAPI.getStats(filters),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    onError: (error) => {
      if (!handleCSRFError(error)) {
        toast.error(error.message || 'Failed to fetch service statistics');
      }
    },
  });
};

export const useSearchServices = (searchParams) => {
  return useQuery({
    queryKey: serviceKeys.search(searchParams),
    queryFn: async () => {
      try {
        if (!searchParams) {
          return {
            success: true,
            data: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 20,
              totalPages: 0
            }
          };
        }

        const result = await servicesAPI.search(searchParams);
        return result || {
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0
          }
        };
      } catch (error) {
        console.error('Search services error:', error);
        return {
          success: false,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0
          },
          error: error.message
        };
      }
    },
    enabled: Boolean(searchParams?.query || searchParams?.q || searchParams?.category),
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 1;
    },
    onError: (error) => {
      if (!handleCSRFError(error)) {
        toast.error(error.message || 'Failed to search services');
      }
    },
  });
};

export const useSimilarServices = (serviceId, params = {}) => {
  return useQuery({
    queryKey: serviceKeys.similar(serviceId, params),
    queryFn: () => servicesAPI.getSimilar(serviceId, params),
    enabled: !!serviceId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useBulkServiceOperations = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ ids, operation, data = {} }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return servicesAPI.bulkOperation(ids, operation, data);
    },
    onMutate: () => {
      toast.loading('Processing bulk operation...');
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(serviceKeys.myServices());
        queryClient.invalidateQueries(serviceKeys.lists());
        toast.success(data.message || 'Bulk operation completed successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Failed to perform bulk operation');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useUploadServiceImages = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ serviceId, files }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return servicesAPI.uploadImages(serviceId, files);
    },
    onMutate: () => {
      toast.loading('Uploading images...');
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(serviceKeys.detail(variables.serviceId));
        queryClient.invalidateQueries(serviceKeys.myServices());
        queryClient.invalidateQueries(serviceKeys.images(variables.serviceId));
        toast.success(data.message || 'Images uploaded successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Failed to upload images');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useRemoveServiceImage = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ serviceId, publicId }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return servicesAPI.removeImage(serviceId, publicId);
    },
    onMutate: () => {
      toast.loading('Removing image...');
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(serviceKeys.detail(variables.serviceId));
        queryClient.invalidateQueries(serviceKeys.myServices());
        queryClient.invalidateQueries(serviceKeys.images(variables.serviceId));
        toast.success(data.message || 'Image removed successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Failed to remove image');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useSetThumbnail = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ serviceId, publicId }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return servicesAPI.setThumbnail(serviceId, publicId);
    },
    onMutate: () => {
      toast.loading('Setting thumbnail...');
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(serviceKeys.detail(variables.serviceId));
        queryClient.invalidateQueries(serviceKeys.myServices());
        queryClient.invalidateQueries(serviceKeys.thumbnail(variables.serviceId));
        toast.success(data.message || 'Thumbnail updated successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Failed to set thumbnail');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useServicesByCategoryId = (categoryId, params = {}, options = {}) => {
  return useQuery({
    queryKey: serviceKeys.byCategory(categoryId, params),
    queryFn: async () => {
      if (!categoryId) return { success: true, data: [] };
      
      try {
        const result = await servicesAPI.getByCategoryId(categoryId, params);
        return {
          success: true,
          data: Array.isArray(result) ? result : (result?.data || []),
          pagination: result?.pagination || {
            page: params.page || 1,
            limit: params.limit || 12,
            total: Array.isArray(result) ? result.length : (result?.data || []).length,
            totalPages: Math.ceil((Array.isArray(result) ? result.length : (result?.data || []).length) / (params.limit || 12))
          }
        };
      } catch (error) {
        console.error('Error fetching services by category ID:', error);
        return {
          success: false,
          data: [],
          error: error.message
        };
      }
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useServicesBySubcategoryId = (subcategoryId, params = {}, options = {}) => {
  return useQuery({
    queryKey: serviceKeys.bySubcategory(subcategoryId, params),
    queryFn: async () => {
      if (!subcategoryId) return { success: true, data: [] };
      
      try {
        const result = await servicesAPI.getBySubcategoryId(subcategoryId, params);
        return {
          success: true,
          data: Array.isArray(result) ? result : (result?.data || []),
          pagination: result?.pagination || {
            page: params.page || 1,
            limit: params.limit || 12,
            total: Array.isArray(result) ? result.length : (result?.data || []).length,
            totalPages: Math.ceil((Array.isArray(result) ? result.length : (result?.data || []).length) / (params.limit || 12))
          }
        };
      } catch (error) {
        console.error('Error fetching services by subcategory ID:', error);
        return {
          success: false,
          data: [],
          error: error.message
        };
      }
    },
    enabled: !!subcategoryId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useServicesBySubcategorySlug = (subcategorySlug, params = {}, options = {}) => {
  return useQuery({
    queryKey: serviceKeys.bySubcategorySlug(subcategorySlug, params),
    queryFn: async () => {
      if (!subcategorySlug) return { success: true, data: [] };
      
      try {
        const result = await servicesAPI.getBySubcategorySlug(subcategorySlug, params);
        return {
          success: true,
          data: Array.isArray(result) ? result : (result?.data || []),
          pagination: result?.pagination || {
            page: params.page || 1,
            limit: params.limit || 12,
            total: Array.isArray(result) ? result.length : (result?.data || []).length,
            totalPages: Math.ceil((Array.isArray(result) ? result.length : (result?.data || []).length) / (params.limit || 12))
          }
        };
      } catch (error) {
        console.error('Error fetching services by subcategory slug:', error);
        return {
          success: false,
          data: [],
          error: error.message
        };
      }
    },
    enabled: !!subcategorySlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useAdminServices = (filters = {}) => {
  const { user } = useAuthStore();
  const { validate: validateCSRF } = useCSRF();
  
  return useQuery({
    queryKey: serviceKeys.adminList(filters),
    queryFn: async () => {
      if (user?.role !== 'admin') {
        throw new Error('Admin access required');
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      try {
        const result = await servicesAPI.getAdminServices(filters);
        return result || {
          success: false,
          data: [],
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 12,
            total: 0,
            totalPages: 0
          }
        };
      } catch (error) {
        console.error('Admin services API error:', error);
        return {
          success: false,
          data: [],
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 12,
            total: 0,
            totalPages: 0
          },
          error: error.message
        };
      }
    },
    enabled: user?.role === 'admin',
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (error) => {
      if (!handleCSRFError(error)) {
        toast.error(error.message || 'Failed to load admin services');
      }
    },
  });
};

// Infinite query hooks
export const useInfiniteServices = (queryParams = {}) => {
  const { user } = useAuthStore();
  
  return useInfiniteQuery({
    queryKey: serviceKeys.list({ ...queryParams, infinite: true }),
    queryFn: ({ pageParam = 1 }) => 
      servicesAPI.getAll({ 
        ...queryParams, 
        page: pageParam,
        createdBy: queryParams.createdBy === 'me' ? user?._id : queryParams.createdBy
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination || lastPage.data?.pagination;
      if (pagination?.hasNext) {
        return pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !(queryParams.createdBy === 'me' && !user?._id),
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
  });
};

export const useInfiniteServicesBySubcategory = (subcategoryId, params = {}) => {
  return useInfiniteQuery({
    queryKey: serviceKeys.bySubcategory(subcategoryId, params),
    queryFn: ({ pageParam = 1 }) => 
      servicesAPI.getBySubcategoryId(subcategoryId, { ...params, page: pageParam }),
    enabled: !!subcategoryId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (pagination?.hasNext) {
        return pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
  });
};

// CSRF protection wrapper for service operations
export const useServiceCSRFProtection = () => {
  const { token, isLoading, isError, error, refetch, refresh, validate, hasToken } = useCSRF();
  
  const ensureCSRF = async (operation) => {
    const hasValidCSRF = await validate();
    if (!hasValidCSRF) {
      throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
    }
    return operation();
  };
  
  return {
    token,
    isLoading,
    isError,
    error,
    refetch,
    refresh,
    validate,
    hasToken,
    ensureCSRF
  };
};