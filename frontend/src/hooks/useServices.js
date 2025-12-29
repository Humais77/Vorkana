import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesAPI } from '../api/services.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const useMyServices = (filters = {}) => {
  return useQuery({
    queryKey: ['myServices', filters],
    queryFn: async () => {
      try {
        const result = await servicesAPI.getMyServices(filters);
        return result;
      } catch (error) {
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      toast.error(error.message || 'Failed to load your services');
    },
  });
};

export const useServices = (filters = {}) => {
  return useQuery({
    queryKey: ['services', filters],
    queryFn: async () => {
      try {
        const result = await servicesAPI.getAll(filters);
        return result || {
          success: true,
          data: [],
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 12,
            total: 0,
            totalPages: 0
          }
        };
      } catch (error) {
        console.error('Services API error:', error);
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
    onError: (error) => {
      toast.error(error.message || 'Failed to load services');
    },
  });
};
export const useService = (identifier) => {
  return useQuery({
    queryKey: ['service', identifier],
    queryFn: () => servicesAPI.getById(identifier),
    enabled: !!identifier,
    retry: false,
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
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
    onError: (error) => {
      console.error('Failed to load popular services:', error);
    },
  });
};
// Add these hooks to your existing useServices.js file

/**
 * Hook to get services by category ID
 */
export const useServicesByCategory = (categoryId, subcategoryId = null, options = {}) => {
  return useQuery({
    queryKey: ['services', 'category', categoryId, subcategoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      try {
        // Use servicesAPI instead of direct axiosInstance
        const result = await servicesAPI.getAll({
          category: categoryId,
          subcategory: subcategoryId,
          status: 'active',
          limit: 50
        });
        
        // Handle different response structures
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
/**
 * Hook to get services by subcategory slug
 */
export const useServicesBySubcategory = (subcategorySlug, options = {}) => {
  return useQuery({
    queryKey: ['services', 'subcategory', subcategorySlug],
    queryFn: async () => {
      if (!subcategorySlug) return [];
      
      try {
        // Use servicesAPI with subcategory filter
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
    staleTime: 10 * 60 * 1000, // 10 minutes cache
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
        // Invalidate relevant queries
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
    mutationFn: async ({ serviceData, files = null }) => {
      const result = await servicesAPI.create(serviceData, files);
      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        navigate('/profile?tab=services');
        toast.success(data.message || 'Service created successfully!');
      } else {
        throw new Error(data.message || 'Failed to create service');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create service');
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data, files = null }) => {
      return servicesAPI.update(id, data, files);
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        queryClient.invalidateQueries(['service', data.service?._id]);
        toast.success(data.message || 'Service updated successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update service');
    },
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

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, action = 'toggle' }) => {
      return servicesAPI.toggleLike(serviceId, action);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['services']);
        toast.success(data.message || 'Action completed');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to perform action');
    },
  });
};

export const useServiceStats = (filters = {}) => {
  return useQuery({
    queryKey: ['serviceStats', filters],
    queryFn: () => servicesAPI.getStats(filters),
    refetchOnWindowFocus: false,
    // Add error handling
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
        // If searchParams is null or undefined, return empty result
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
        // Always return a value, even on error
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
    staleTime: 2 * 60 * 1000, // 2 minutes
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