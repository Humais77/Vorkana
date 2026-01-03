import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { gigsAPI } from '../api/gigs';
import { useGigStore } from '../store/useGigStore';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

export const gigKeys = {
  all: ['gigs'],
  lists: () => [...gigKeys.all, 'list'],
  list: (filters) => [...gigKeys.lists(), filters],
  details: () => [...gigKeys.all, 'detail'],
  detail: (id) => [...gigKeys.details(), id],
  myGigs: () => [...gigKeys.all, 'my-gigs'],
  stats: () => [...gigKeys.all, 'stats'],
  popular: () => [...gigKeys.all, 'popular'],
  search: (params) => [...gigKeys.all, 'search', params],
  bySubcategory: (subcategoryId, params) => [...gigKeys.all, 'subcategory', subcategoryId, params],
};

export const extractGigsFromResponse = (response) => {
  if (!response) return [];
  
  if (Array.isArray(response)) {
    return response;
  }
  
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  if (response.gigs && Array.isArray(response.gigs)) {
    return response.gigs;
  }
  
  if (response.success && response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  return [];
};

export const useMyGigs = (filters = {}) => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['myGigs', filters, user?._id],
    queryFn: async () => {
      if (!user?._id) {
        throw new Error('User not authenticated');
      }
      
      return gigsAPI.getAll({
        ...filters,
        createdBy: user._id,
        includeSubcategory: true, // Always include subcategory
      });
    },
    enabled: !!user?._id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    onError: (error) => {
      if (error.message !== 'User not authenticated') {
        toast.error('Failed to load your gigs');
      }
    }
  });
};

export const useGigs = (params = {}) => {
  return useQuery({
    queryKey: ['gigs', params],
    queryFn: () => gigsAPI.getAll({
      ...params,
      includeSubcategory: true, // Always include subcategory
    }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    onError: (error) => {
      if (error.code !== 'SERVER_ERROR') {
        toast.error('Failed to load gigs');
      }
    }
  });
};

export const useGigsBySubcategory = (subcategoryId, params = {}) => {
  return useQuery({
    queryKey: gigKeys.bySubcategory(subcategoryId, params),
    queryFn: () => gigsAPI.getBySubcategory(subcategoryId, params),
    enabled: !!subcategoryId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    onError: (error) => {
      toast.error('Failed to load gigs for this subcategory');
    }
  });
};

export const useInfiniteGigs = (queryParams = {}) => {
  const { user } = useAuthStore();
  
  return useInfiniteQuery({
    queryKey: gigKeys.list({ ...queryParams, infinite: true }),
    queryFn: ({ pageParam = 1 }) => 
      gigsAPI.getAll({ 
        ...queryParams, 
        page: pageParam,
        includeSubcategory: true, // Always include subcategory
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
  });
};

export const usePopularGigs = () => {
  return useQuery({
    queryKey: gigKeys.popular(),
    queryFn: () => gigsAPI.getAll({
      page: 1,
      limit: 8,
      sort: 'budget',
      order: 'desc',
      status: 'open',
      urgency: 'high',
      includeCategory: true,
      includeSubcategory: true, // Include subcategory
      includeClient: true
    }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useGig = (id) => {
  const setGigDetails = useGigStore((state) => state.setGigDetails);
  
  return useQuery({
    queryKey: gigKeys.detail(id),
    queryFn: () => gigsAPI.getById(id),
    enabled: !!id && id !== 'undefined',
    refetchOnWindowFocus: true,
refetchOnReconnect: true,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.status === 404) return false;
      return failureCount < 3;
    },
    onSuccess: (data, variables) => {
  const updatedGig = data.data || data.gig || data;

  // Instantly update the single gig cache — feels immediate!
  queryClient.setQueryData(gigKeys.detail(variables.id), (oldData) => {
    if (!oldData) return { gig: updatedGig, data: updatedGig };
    return {
      ...oldData,
      gig: updatedGig,
      data: updatedGig,
    };
  });

  // Also update any list caches optimistically (optional but nice)
  queryClient.setQueryData(gigKeys.lists(), (old) => {
    if (!old || !Array.isArray(old.data)) return old;
    return {
      ...old,
      data: old.data.map((gig) =>
        gig._id === variables.id ? updatedGig : gig
      ),
    };
  });

  // Still invalidate lists to ensure freshness on next load
  queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
  queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });

  toast.success(data.message || 'Gig updated successfully!');
},
  });
};

export const useCreateGig = () => {
  const queryClient = useQueryClient();
  const setLastCreatedGigId = useGigStore((state) => state.setLastCreatedGigId);
  
  return useMutation({
    mutationFn: async (gigData) => {
      // Validate subcategory is required
      if (!gigData.subcategory && !(gigData instanceof FormData)) {
        throw {
          message: 'Subcategory is required',
          code: 'SUBCATEGORY_REQUIRED',
          status: 400
        };
      }
      
      // If FormData, check for subcategory
      if (gigData instanceof FormData) {
        const subcategory = gigData.get('subcategory');
        if (!subcategory) {
          throw {
            message: 'Subcategory is required',
            code: 'SUBCATEGORY_REQUIRED',
            status: 400
          };
        }
      }
      
      return gigsAPI.create(gigData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['myGigs'] });
      
      const gigId = data.data?._id || data.gig?._id;
      if (gigId) {
        setLastCreatedGigId(gigId);
      }
      
      toast.success(data.message || 'Gig created successfully!');
    },
    onError: (error) => {
      let errorMessage = error.message || 'Failed to create gig';
      
      if (error.code === 'SUBCATEGORY_REQUIRED') {
        errorMessage = 'Please select a subcategory';
      } else if (error.code === 'CATEGORY_NOT_FOUND') {
        errorMessage = 'Please select a valid category';
      } else if (error.code === 'SUBCATEGORY_NOT_FOUND') {
        errorMessage = 'Please select a valid subcategory';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to create a gig';
      }
      
      toast.error(errorMessage);
    },
  });
};

export const useUpdateGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      // If FormData, append version separately
      if (data instanceof FormData) {
        // Don't need to modify FormData - version will be appended by the frontend
        return gigsAPI.update(id, data);
      } else {
        // For JSON data, ensure version is included
        return gigsAPI.update(id, data);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: gigKeys.detail(variables.id) 
      });
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      toast.success(data.message || 'Gig updated successfully!');
    },
    onError: (error) => {
      if (error.code === 'SUBCATEGORY_REQUIRED') {
        toast.error('Please select a subcategory');
      } else if (error.code === 'VERSION_CONFLICT') {
        toast.error('This gig was modified by another user. Please refresh and try again.');
      } else {
        toast.error(error.data?.message || error.message || 'Failed to update gig');
      }
    },
  });
};

export const useDeleteGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, options = {} }) => gigsAPI.delete(id, options),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.popular() });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      if (variables.options?.permanent) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.id) });
      }
      
      toast.success(data.message || 'Gig deleted successfully!');
    },
    onError: (error) => {
      if (error.code === 'GIG_IN_PROGRESS') {
        toast.error('Cannot delete gig that is in progress. Use force delete if necessary.');
      } else {
        toast.error(error.data?.message || error.message || 'Failed to delete gig');
      }
    },
  });
};

export const useDeleteMultipleGigs = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids) => {
      const results = [];
      const errors = [];
      
      for (const id of ids) {
        try {
          const result = await gigsAPI.delete(id);
          results.push({ id, success: true, result });
        } catch (error) {
          if (error.message?.includes('validation failed') || error.code === 'DELETE_VALIDATION_ERROR') {
            try {
              const forceResult = await gigsAPI.delete(id, { force: true });
              results.push({ id, success: true, result: forceResult, forceDeleted: true });
            } catch (forceError) {
              errors.push({ id, error: forceError.message });
            }
          } else {
            errors.push({ id, error: error.message });
          }
        }
      }
      
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} gig(s). ${errors.map(e => `Gig ${e.id}: ${e.error}`).join(', ')}`);
      }
      
      return results;
    },
    onSuccess: (data, ids) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      queryClient.invalidateQueries({ queryKey: gigKeys.popular() });
      
      ids.forEach(id => {
        queryClient.removeQueries({ queryKey: gigKeys.detail(id) });
      });
      
      const forceDeletedCount = data.filter(d => d.forceDeleted).length;
      if (forceDeletedCount > 0) {
        toast.success(`${ids.length} gig(s) deleted (${forceDeletedCount} required force deletion)`);
      } else {
        toast.success(`${ids.length} gig(s) deleted successfully!`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete gigs');
    },
  });
};

export const useUpdateGigStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }) => {
      return gigsAPI.update(id, { status });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      toast.success(`Gig marked as ${variables.status}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update gig status');
    },
  });
};

export const useUpdateMultipleGigsStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, status }) => {
      const results = await Promise.all(
        ids.map(id => gigsAPI.update(id, { status }))
      );
      return results;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      variables.ids.forEach(id => {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(id) });
      });
      
      toast.success(`${variables.ids.length} gig(s) marked as ${variables.status}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update gigs status');
    },
  });
};

export const useRestoreGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => gigsAPI.restore(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables) });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      toast.success(data.message || 'Gig restored successfully!');
    },
    onError: (error) => {
      toast.error(error.data?.message || error.message || 'Failed to restore gig');
    },
  });
};

export const useGigStats = () => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: gigKeys.stats(),
    queryFn: async () => {
      try {
        const response = await gigsAPI.getStats();
        return response;
      } catch (error) {
        return {
          success: false,
          data: {
            overview: [{
              totalGigs: 0,
              activeGigs: 0,
              totalOrders: 0,
              totalBudget: 0,
              avgBudget: 0,
              averageRating: 4.8
            }]
          },
          isFallback: true
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?._id,
    retry: 1,
    retryDelay: 1000
  });
};

export const useSearchGigs = (searchParams = {}) => {
  return useQuery({
    queryKey: gigKeys.search(searchParams),
    queryFn: () => gigsAPI.search(searchParams),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: Boolean(searchParams.query?.trim()),
  });
};

export const useExportGigs = () => {
  return useMutation({
    mutationFn: (params) => gigsAPI.exportGigs(params),
    onSuccess: (data) => {
      if (data.format === 'csv') {
        toast.success('CSV export started. Check your downloads.');
      } else {
        toast.success('Gigs exported successfully!');
      }
    },
    onError: (error) => {
      if (error.code === 'EXPORT_LIMIT_EXCEEDED') {
        toast.error('Export limit exceeded. Please use filters to reduce the number of records.');
      } else {
        toast.error(error.data?.message || error.message || 'Failed to export gigs');
      }
    },
  });
};

export const useSimilarGigs = (gigId) => {
  return useQuery({
    queryKey: ['gigs', 'similar', gigId],
    queryFn: () => gigsAPI.getSimilar(gigId),
    enabled: !!gigId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useToggleGigSelection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gigId, selected }) => {
      return { gigId, selected };
    },
    onMutate: async ({ gigId, selected }) => {
      await queryClient.cancelQueries({ queryKey: gigKeys.myGigs() });
      
      const previousGigs = queryClient.getQueryData(gigKeys.myGigs());
      
      queryClient.setQueryData(gigKeys.myGigs(), (old) => {
        if (!old) return old;
        
        const updatedGigs = extractGigsFromResponse(old).map(gig => 
          gig._id === gigId 
            ? { ...gig, _selected: selected }
            : gig
        );
        
        return {
          ...old,
          gigs: updatedGigs,
          data: updatedGigs
        };
      });
      
      return { previousGigs };
    },
    onError: (err, variables, context) => {
      if (context?.previousGigs) {
        queryClient.setQueryData(gigKeys.myGigs(), context.previousGigs);
      }
      toast.error('Failed to update selection');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
    },
  });
};

export const useUploadGigImages = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gigId, files }) => {
      return gigsAPI.uploadImages(gigId, files);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.gigId) });
        toast.success(data.message || 'Images uploaded successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload images');
    },
  });
};

export const useRemoveGigImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gigId, publicId }) => {
      return gigsAPI.removeImage(gigId, publicId);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.gigId) });
        toast.success(data.message || 'Image removed successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove image');
    },
  });
};

export const useSetGigThumbnail = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gigId, publicId }) => {
      return gigsAPI.setThumbnail(gigId, publicId);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.gigId) });
        toast.success(data.message || 'Thumbnail updated successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to set thumbnail');
    },
  });
};

export const useUploadGigThumbnail = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gigId, file }) => {
      return gigsAPI.uploadThumbnail(gigId, file);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.gigId) });
        toast.success(data.message || 'Thumbnail uploaded successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload thumbnail');
    },
  });
};

// New hook for gigs by subcategory with infinite scroll
export const useInfiniteGigsBySubcategory = (subcategoryId, params = {}) => {
  return useInfiniteQuery({
    queryKey: gigKeys.bySubcategory(subcategoryId, params),
    queryFn: ({ pageParam = 1 }) => 
      gigsAPI.getBySubcategory(subcategoryId, { ...params, page: pageParam }),
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
  });
};