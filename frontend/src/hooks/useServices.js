// hooks/useServices.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesAPI } from '../api/services.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';


// Fetch seller's services
export const useMyServices = (filters = {}) => {
  return useQuery({
    queryKey: ['myServices', filters],
    queryFn: async () => {
      try {
        const result = await servicesAPI.getMyServices(filters);
        console.log('useMyServices result:', result);
        return result;
      } catch (error) {
        console.error('useMyServices query error:', error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Get my services error:', error);
      toast.error(error.message || 'Failed to load your services');
    },
  });
};

// Fetch all services (public)
export const useServices = (filters = {}) => {
  return useQuery({
    queryKey: ['services', filters],
    queryFn: () => servicesAPI.getAll(filters),
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Get services error:', error);
      toast.error(error.message || 'Failed to load services');
    },
  });
};

// Fetch single service
export const useService = (identifier) => {
  return useQuery({
    queryKey: ['service', identifier],
    queryFn: () => servicesAPI.getById(identifier),
    enabled: !!identifier,
    retry: false,
    onError: (error) => {
      console.error('Get service error:', error);
      toast.error(error.message || 'Failed to load service');
    },
  });
};

// Fetch categories
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const categories = await servicesAPI.getCategories();
        console.log('Categories fetched:', categories);
        return categories;
      } catch (error) {
        console.error('Categories fetch error:', error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      console.error('Get categories error:', error);
      // Don't show toast for categories error as it's handled in the component
    },
  });
};

// Create new service
export const useCreateService = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: async ({ serviceData, files = null }) => {
      console.log('Creating service:', serviceData);
      const result = await servicesAPI.create(serviceData, files);
      console.log('Create service result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Create service success:', data);
      
      if (data.success) {
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        
        // Navigate to profile with services tab
        navigate('/profile?tab=services');
        toast.success(data.message || 'Service created successfully!');
      } else {
        throw new Error(data.message || 'Failed to create service');
      }
    },
    onError: (error) => {
      console.error('Create service mutation error:', error);
      toast.error(error.message || 'Failed to create service');
    },
  });
};

// Update service
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
      console.error('Update service error:', error);
      toast.error(error.message || 'Failed to update service');
    },
  });
};

// Delete service
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
      console.error('Delete service error:', error);
      toast.error(error.message || 'Failed to delete service');
    },
  });
};

// Like/Unlike service
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
      console.error('Toggle like error:', error);
      toast.error(error.message || 'Failed to perform action');
    },
  });
};

// Get service stats
export const useServiceStats = (filters = {}) => {
  return useQuery({
    queryKey: ['serviceStats', filters],
    queryFn: () => servicesAPI.getStats(filters),
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Failed to fetch service stats:', error);
    },
  });
};

// Search services
export const useSearchServices = (searchParams) => {
  return useQuery({
    queryKey: ['searchServices', searchParams],
    queryFn: () => servicesAPI.search(searchParams),
    enabled: Boolean(searchParams?.query || searchParams?.q || searchParams?.category),
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Search services error:', error);
      toast.error(error.message || 'Failed to search services');
    },
  });
};

// Get similar services
export const useSimilarServices = (serviceId, params = {}) => {
  return useQuery({
    queryKey: ['similarServices', serviceId, params],
    queryFn: () => servicesAPI.getSimilar(serviceId, params),
    enabled: !!serviceId,
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Failed to fetch similar services:', error);
    },
  });
};

// Bulk operations
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
      console.error('Bulk operation error:', error);
      toast.error(error.message || 'Failed to perform bulk operation');
    },
  });
};

// Upload images
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
      console.error('Upload images error:', error);
      toast.error(error.message || 'Failed to upload images');
    },
  });
};

// Remove image
export const useRemoveServiceImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, imageUrl }) => {
      return servicesAPI.removeImage(serviceId, imageUrl);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['myServices']);
        toast.success(data.message || 'Image removed successfully!');
      }
    },
    onError: (error) => {
      console.error('Remove image error:', error);
      toast.error(error.message || 'Failed to remove image');
    },
  });
};