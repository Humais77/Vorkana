// useService.js - Updated for Cloudinary integration
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesAPI } from '../api/services.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ============================================
// Queries
// ============================================

export const useMyServices = (filters = {}) => {
  return useQuery({
    queryKey: ['myServices', filters],
    queryFn: async () => {
      try {
        const result = await servicesAPI.getMyServices(filters);
        return result;
      } catch (error) {
        console.error('Error fetching my services:', error);
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
        const data = await servicesAPI.getAll(filters);
        return data;
      } catch (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    onError: (error) => {
      toast.error(error.message || 'Failed to load services');
    },
  });
};

export const useService = (identifier, options = {}) => {
  return useQuery({
    queryKey: ['service', identifier],
    queryFn: async () => {
      try {
        const service = await servicesAPI.getById(identifier, options);
        return service;
      } catch (error) {
        console.error('Error fetching service:', error);
        throw error;
      }
    },
    enabled: !!identifier,
    retry: false,
    onError: (error) => {
      toast.error(error.message || 'Failed to load service');
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
        console.error('Error fetching categories:', error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      toast.error('Failed to load categories');
    },
  });
};

export const useSearchServices = (searchParams) => {
  return useQuery({
    queryKey: ['searchServices', searchParams],
    queryFn: async () => {
      try {
        const results = await servicesAPI.search(searchParams);
        return results;
      } catch (error) {
        console.error('Error searching services:', error);
        throw error;
      }
    },
    enabled: Boolean(searchParams?.query || searchParams?.q || searchParams?.category),
    refetchOnWindowFocus: false,
    onError: (error) => {
      toast.error(error.message || 'Failed to search services');
    },
  });
};

export const useSimilarServices = (serviceId, params = {}) => {
  return useQuery({
    queryKey: ['similarServices', serviceId, params],
    queryFn: async () => {
      try {
        const services = await servicesAPI.getSimilar(serviceId, params);
        return services;
      } catch (error) {
        console.error('Error fetching similar services:', error);
        throw error;
      }
    },
    enabled: !!serviceId,
    refetchOnWindowFocus: false,
  });
};

export const useServiceStats = (filters = {}) => {
  return useQuery({
    queryKey: ['serviceStats', filters],
    queryFn: async () => {
      try {
        const stats = await servicesAPI.getServiceStats(filters);
        return stats;
      } catch (error) {
        console.error('Error fetching service stats:', error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    onError: (error) => {
      toast.error(error.message || 'Failed to fetch service statistics');
    },
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateService = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: async ({ serviceData, files = null }) => {
      try {
        // Validate files if provided
        if (files) {
          files.forEach(file => {
            servicesAPI.validateImageFile(file);
          });
        }
        
        const result = await servicesAPI.create(serviceData, files);
        return result;
      } catch (error) {
        console.error('Create service error:', error);
        throw error;
      }
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
      console.error('Create service mutation error:', error);
      toast.error(error.message || 'Failed to create service');
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data, files = null }) => {
      try {
        // Validate files if provided
        if (files) {
          files.forEach(file => {
            servicesAPI.validateImageFile(file);
          });
        }
        
        return await servicesAPI.update(id, data, files);
      } catch (error) {
        console.error('Update service error:', error);
        throw error;
      }
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
      console.error('Update service mutation error:', error);
      toast.error(error.message || 'Failed to update service');
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, options = {} }) => {
      try {
        return await servicesAPI.delete(id, options);
      } catch (error) {
        console.error('Delete service error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        toast.success(data.message || 'Service deleted successfully!');
      }
    },
    onError: (error) => {
      console.error('Delete service mutation error:', error);
      toast.error(error.message || 'Failed to delete service');
    },
  });
};

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, action = 'toggle' }) => {
      try {
        return await servicesAPI.toggleLike(serviceId, action);
      } catch (error) {
        console.error('Toggle like error:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['services']);
        toast.success(data.message || 'Action completed');
      }
    },
    onError: (error) => {
      console.error('Toggle like mutation error:', error);
      toast.error(error.message || 'Failed to perform action');
    },
  });
};

// ============================================
// Image Management Mutations
// ============================================

export const useUploadServiceImages = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, files }) => {
      try {
        // Validate files
        files.forEach(file => {
          servicesAPI.validateImageFile(file);
        });
        
        return await servicesAPI.uploadImages(serviceId, files);
      } catch (error) {
        console.error('Upload images error:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['myServices']);
        toast.success(data.message || 'Images uploaded successfully!');
      }
    },
    onError: (error) => {
      console.error('Upload images mutation error:', error);
      toast.error(error.message || 'Failed to upload images');
    },
  });
};

export const useRemoveServiceImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, imageUrl }) => {
      try {
        return await servicesAPI.removeImage(serviceId, imageUrl);
      } catch (error) {
        console.error('Remove image error:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['myServices']);
        toast.success(data.message || 'Image removed successfully!');
      }
    },
    onError: (error) => {
      console.error('Remove image mutation error:', error);
      toast.error(error.message || 'Failed to remove image');
    },
  });
};

export const useSetThumbnail = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, imageUrl }) => {
      try {
        return await servicesAPI.setThumbnail(serviceId, imageUrl);
      } catch (error) {
        console.error('Set thumbnail error:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['myServices']);
        toast.success(data.message || 'Thumbnail set successfully!');
      }
    },
    onError: (error) => {
      console.error('Set thumbnail mutation error:', error);
      toast.error(error.message || 'Failed to set thumbnail');
    },
  });
};

export const useUploadThumbnail = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serviceId, file }) => {
      try {
        // Validate thumbnail file
        servicesAPI.validateThumbnailFile(file);
        
        return await servicesAPI.uploadThumbnail(serviceId, file);
      } catch (error) {
        console.error('Upload thumbnail error:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['service', variables.serviceId]);
        queryClient.invalidateQueries(['myServices']);
        toast.success(data.message || 'Thumbnail uploaded successfully!');
      }
    },
    onError: (error) => {
      console.error('Upload thumbnail mutation error:', error);
      toast.error(error.message || 'Failed to upload thumbnail');
    },
  });
};

export const useBulkServiceOperations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, operation, data = {} }) => {
      try {
        return await servicesAPI.bulkOperation(ids, operation, data);
      } catch (error) {
        console.error('Bulk operation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(['myServices']);
        queryClient.invalidateQueries(['services']);
        toast.success(data.message || 'Bulk operation completed successfully!');
      }
    },
    onError: (error) => {
      console.error('Bulk operation mutation error:', error);
      toast.error(error.message || 'Failed to perform bulk operation');
    },
  });
};

// ============================================
// Helper Hooks
// ============================================

export const useServiceForm = () => {
  const [files, setFiles] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    // Validate each file
    selectedFiles.forEach(file => {
      try {
        servicesAPI.validateImageFile(file);
      } catch (error) {
        toast.error(`${file.name}: ${error.message}`);
        return;
      }
    });
    
    setFiles(prev => [...prev, ...selectedFiles]);
  };
  
  const handleThumbnailChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      servicesAPI.validateThumbnailFile(file);
      setThumbnailFile(file);
    } catch (error) {
      toast.error(error.message);
      event.target.value = null; // Reset input
    }
  };
  
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  return {
    files,
    thumbnailFile,
    handleFileChange,
    handleThumbnailChange,
    removeFile,
    setFiles,
    setThumbnailFile
  };
};