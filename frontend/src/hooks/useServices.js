// useService.js - Updated for cookie-based authentication
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesAPI } from '../api/services.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

// Import the axios instance from services.js
import { axiosInstance } from '../api/services.js';

export const useMyServices = (filters = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  return useQuery({
    queryKey: ['myServices', filters],
    queryFn: async () => {
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
    enabled: isAuthenticated, // Use Zustand auth state
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('useMyServices error:', error);
      if (!error.message.includes('Please login')) {
        toast.error(error.message || 'Failed to load your services');
      }
    },
  });
};

export const useServices = (filters = {}) => {
  return useQuery({
    queryKey: ['services', filters],
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
    onError: (error) => {
      console.error('useServices error:', error);
      if (process.env.NODE_ENV === 'development') {
        toast.error(error.message || 'Failed to load services');
      }
    },
  });
};

export const useService = (identifier) => {
  return useQuery({
    queryKey: ['service', identifier],
    queryFn: () => servicesAPI.getById(identifier),
    enabled: !!identifier,
    retry: false,
    onSuccess: (data) => {
      // Ensure version field is included
      if (data?.service) {
        data.service.version = data.service.version || 1;
      } else if (data?.data) {
        data.data.version = data.data.version || 1;
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to load service');
    },
  });
};

export const usePopularServices = (params = {}) => {
  return useQuery({
    queryKey: ['popularServices', params],
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
    retry: 1,
    onError: (error) => {
      console.error('Failed to load popular services:', error);
    },
  });
};

export const useServicesByCategory = (categoryId, subcategoryId = null, options = {}) => {
  return useQuery({
    queryKey: ['services', 'category', categoryId, subcategoryId],
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
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useServicesBySubcategory = (subcategorySlug, options = {}) => {
  return useQuery({
    queryKey: ['services', 'subcategory', subcategorySlug],
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
    retry: 1,
  });
};

export const useTogglePopularStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, isPopular }) => {
      return servicesAPI.togglePopularStatus(serviceId, isPopular);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['popularServices']);
        queryClient.invalidateQueries(['popularServicesByCategory']);
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        
        toast.success(data.message || `Service ${variables.isPopular ? 'marked as popular' : 'removed from popular'} successfully!`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update popular status');
    },
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
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
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: async (formData) => {
      if (formData instanceof FormData) {
        return servicesAPI.create({}, formData);
      }
      
      const { serviceData, files = null } = formData || {};
      return servicesAPI.create(serviceData, files);
    },
    onMutate: async (newService) => {
      await queryClient.cancelQueries({ queryKey: ['myServices'] });
      
      const previousServices = queryClient.getQueryData(['myServices']);
      
      // Optimistically update
      queryClient.setQueryData(['myServices'], (old) => {
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
        queryClient.setQueryData(['myServices'], (old) => {
          const oldData = Array.isArray(old) ? old : (old?.data || []);
          // Replace optimistic entry with real data
          const filtered = oldData.filter(item => !item.__optimistic);
          return {
            ...old,
            data: [data.data || data.service, ...filtered]
          };
        });
        
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        
        // Set refresh flag
        sessionStorage.setItem('refreshDashboard', 'true');
        
        navigate('/profile?tab=services');
        toast.success(data.message || 'Service created successfully!');
      } else {
        throw new Error(data.message || 'Failed to create service');
      }
    },
    onError: (error, newService, context) => {
      // Rollback
      if (context?.previousServices) {
        queryClient.setQueryData(['myServices'], context.previousServices);
      }
      toast.error(error.message || 'Failed to create service');
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data, headers, version }) => {
      try {
        // If version is provided, add it to the data
        if (version !== undefined) {
          if (data instanceof FormData) {
            data.append('version', version.toString());
          } else if (typeof data === 'object') {
            data.version = version;
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
      await queryClient.cancelQueries({ queryKey: ['service', id] });
      
      // Snapshot the previous value
      const previousService = queryClient.getQueryData(['service', id]);
      
      // Optimistically update the service with the new version
      if (previousService) {
        const newVersion = version ? version + 1 : (previousService.version || 1) + 1;
        
        queryClient.setQueryData(['service', id], (old) => {
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
        
        queryClient.setQueryData(['service', variables.id], (old) => {
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
        queryKey: ['service', variables.id],
        refetchType: 'none' // Don't refetch, we already set the data
      });
      
      queryClient.invalidateQueries({
        queryKey: ['myServices']
      });
      
      queryClient.invalidateQueries({
        queryKey: ['services']
      });
      
      queryClient.invalidateQueries({
        queryKey: ['popularServices']
      });
      
      queryClient.invalidateQueries({
        queryKey: ['popularServicesByCategory']
      });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousService) {
        queryClient.setQueryData(['service', variables.id], context.previousService);
      }
      
      // If version conflict, invalidate the query to get fresh data
      if (error.code === 'VERSION_CONFLICT') {
        queryClient.invalidateQueries({ 
          queryKey: ['service', variables.id] 
        });
      }
    },
    // Add onSettled to ensure fresh data
    onSettled: (data, error, variables) => {
      // Force a fresh fetch to ensure data consistency after settle
      if (error?.code === 'VERSION_CONFLICT') {
        queryClient.invalidateQueries({ 
          queryKey: ['service', variables.id] 
        });
      }
    }
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, options = {} }) => {
      return servicesAPI.delete(id, options);
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        toast.success(data.message || 'Service deleted successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete service');
    },
  });
};


export const useServiceStats = (filters = {}) => {
  return useQuery({
    queryKey: ['serviceStats', filters],
    queryFn: () => servicesAPI.getStats(filters),
    refetchOnWindowFocus: false,
    onError: (error) => {
      toast.error(error.message || 'Failed to fetch service statistics');
    },
  });
};

export const useSearchServices = (searchParams) => {
  return useQuery({
    queryKey: ['searchServices', searchParams],
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
    onError: (error) => {
      toast.error(error.message || 'Failed to search services');
    },
  });
};

export const useSimilarServices = (serviceId, params = {}) => {
  return useQuery({
    queryKey: ['similarServices', serviceId, params],
    queryFn: () => servicesAPI.getSimilar(serviceId, params),
    enabled: !!serviceId,
    refetchOnWindowFocus: false,
  });
};

export const useBulkServiceOperations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, operation, data = {} }) => {
      return servicesAPI.bulkOperation(ids, operation, data);
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        toast.success(data.message || 'Bulk operation completed successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to perform bulk operation');
    },
  });
};

export const useUploadServiceImages = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, files }) => {
      return servicesAPI.uploadImages(serviceId, files);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['myServices']);
        toast.success(data.message || 'Images uploaded successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload images');
    },
  });
};

export const useRemoveServiceImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, publicId }) => {
      return servicesAPI.removeImage(serviceId, publicId);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['myServices']);
        toast.success(data.message || 'Image removed successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove image');
    },
  });
};

export const useSetThumbnail = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, publicId }) => {
      return servicesAPI.setThumbnail(serviceId, publicId);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['myServices']);
        toast.success(data.message || 'Thumbnail updated successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to set thumbnail');
    },
  });
};

export const useServicesByCategoryId = (categoryId, params = {}, options = {}) => {
  return useQuery({
    queryKey: ['services', 'category', categoryId, params],
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
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useServicesBySubcategoryId = (subcategoryId, params = {}, options = {}) => {
  return useQuery({
    queryKey: ['services', 'subcategory', 'id', subcategoryId, params],
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
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useServicesBySubcategorySlug = (subcategorySlug, params = {}, options = {}) => {
  return useQuery({
    queryKey: ['services', 'subcategory', 'slug', subcategorySlug, params],
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
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useAdminServices = (filters = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  return useQuery({
    queryKey: ['adminServices', filters],
    queryFn: async () => {
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
    enabled: isAuthenticated, // Use Zustand auth state
    refetchOnWindowFocus: false,
    onError: (error) => {
      toast.error(error.message || 'Failed to load admin services');
    },
  });
};