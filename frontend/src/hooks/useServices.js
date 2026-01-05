import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesAPI } from '../api/services.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import axios

// Create axios instance for direct use in mutations
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    }
    
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }
    
    return Promise.reject(error);
  }
);

export const useMyServices = (filters = {}) => {
  return useQuery({
    queryKey: ['myServices', filters],
    queryFn: async () => {
      try {
        const result = await servicesAPI.getMyServices(filters);
        return result;
      } catch (error) {
        // Return empty structure on error
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
    enabled: !!localStorage.getItem('userToken') || !!localStorage.getItem('token'),
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('useMyServices error:', error);
      // Don't show toast if it's a 401 (user not logged in)
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
    staleTime: 2 * 60 * 1000, // 2 minutes cache
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
      // If formData is already FormData, use it directly
      if (formData instanceof FormData) {
        return servicesAPI.create({}, formData);
      }
      
      // Otherwise, extract serviceData and files
      const { serviceData, files = null } = formData || {};
      return servicesAPI.create(serviceData, files);
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        queryClient.invalidateQueries(['popularServices']);
        queryClient.invalidateQueries(['popularServicesByCategory']);
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
    mutationFn: async ({ id, data, headers }) => {
      const response = await axiosInstance.put(`api/services/${id}`, data, {
        headers: headers || {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ['service', variables.id]
      });
      
      // Also invalidate service lists
      queryClient.invalidateQueries({
        queryKey: ['services']
      });
      
      // Update the cache immediately with new data
      if (data.service) {
        queryClient.setQueryData(['service', variables.id], data.service);
      }
    },
    onError: (error) => {
      // Handle version conflict specifically
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        
        // You can trigger a refresh of the service data
        if (errorData.code === 'VERSION_CONFLICT') {
          queryClient.invalidateQueries({
            queryKey: ['service', variables.id]
          });
        }
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
    enabled: !!localStorage.getItem('userToken') || !!localStorage.getItem('token'),
    refetchOnWindowFocus: false,
    onError: (error) => {
      toast.error(error.message || 'Failed to load admin services');
    },
  });
};