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
        includeSubcategory: true,
      });
    },
    enabled: !!user?._id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    onError: (error) => {
      if (error.message !== 'User not authenticated') {
        if (error.code === 'SESSION_EXPIRED') {
          toast.error('Session expired. Please login again.');
          // Auth store will handle logout via interceptor
        } else {
          toast.error('Failed to load your gigs');
        }
      }
    }
  });
};

export const useGigs = (params = {}) => {
  return useQuery({
    queryKey: ['gigs', params],
    queryFn: () => gigsAPI.getAll({
      ...params,
      includeSubcategory: true,
    }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    onError: (error) => {
      if (error.code === 'SESSION_EXPIRED') {
        toast.error('Session expired. Please login again.');
      } else if (error.code !== 'SERVER_ERROR') {
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
      if (error.code === 'SESSION_EXPIRED') {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load gigs for this subcategory');
      }
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
        includeSubcategory: true,
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
      includeSubcategory: true,
      includeClient: true
    }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useGig = (id) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: gigKeys.detail(id),
    queryFn: () => gigsAPI.getById(id),
    enabled: !!id && id !== 'undefined',
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000,
    
    // Accept initialData for optimistic updates
    initialData: () => {
      // Try to get from cache first
      return queryClient.getQueryData(gigKeys.detail(id));
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
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
  });
};

const applyOptimisticUpdate = (queryClient, gigId, updates) => {
  // Update single gig cache
  queryClient.setQueryData(gigKeys.detail(gigId), (old) => {
    if (!old) return old;
    const updatedGig = {
      ...old.data,
      ...old.gig,
      ...updates,
      subcategory: updates.subcategory ? {
        _id: updates.subcategory,
        name: updates.subcategoryName || "Loading..."
      } : old.data?.subcategory,
      projectCategory: updates.projectCategory ? {
        _id: updates.projectCategory,
        name: updates.categoryName || "Loading..."
      } : old.data?.projectCategory
    };
    
    return {
      ...old,
      gig: updatedGig,
      data: updatedGig
    };
  });

  // Update gigs list cache
  queryClient.setQueryData(gigKeys.myGigs(), (old) => {
    if (!old || !old.data) return old;
    return {
      ...old,
      data: old.data.map(g => {
        if (g._id === gigId) {
          return {
            ...g,
            ...updates,
            subcategory: updates.subcategory ? {
              _id: updates.subcategory,
              name: updates.subcategoryName || "Loading..."
            } : g.subcategory,
            projectCategory: updates.projectCategory ? {
              _id: updates.projectCategory,
              name: updates.categoryName || "Loading..."
            } : g.projectCategory
          };
        }
        return g;
      })
    };
  });
};

export const useUpdateGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      return gigsAPI.update(id, data);
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: gigKeys.detail(id) });
      
      // Snapshot the previous value
      const previousGig = queryClient.getQueryData(gigKeys.detail(id));
      
      // Extract updates from data
      let updates = {};
      
      if (data instanceof FormData) {
        // Try to extract data from FormData for optimistic update
        try {
          // Extract title if available
          const title = data.get('title');
          if (title) updates.title = title;
          
          // Extract description if available
          const description = data.get('description');
          if (description) updates.description = description;
          
          // Extract budget if available
          const budget = data.get('budget');
          if (budget) updates.budget = parseFloat(budget);
          
          // Extract currency if available
          const currency = data.get('currency');
          if (currency) updates.currency = currency;
          
          // Add timestamp
          updates.updatedAt = new Date().toISOString();
        } catch (e) {
          // Fallback basic update
          updates.updatedAt = new Date().toISOString();
        }
      } else {
        updates = {
          ...data,
          updatedAt: new Date().toISOString(),
        };
      }
      
      // Optimistically update the gig
      queryClient.setQueryData(gigKeys.detail(id), (old) => {
        if (!old) return old;
        
        const oldGig = old.data || old.gig || old;
        
        return {
          ...old,
          gig: { ...oldGig, ...updates },
          data: { ...oldGig, ...updates },
        };
      });
      
      return { previousGig };
    },
    onSuccess: (response, variables) => {
      // Get the updated gig from response
      const updatedGig = response.data || response.gig || response;
      
      // Update cache with server response
      queryClient.setQueryData(gigKeys.detail(variables.id), {
        gig: updatedGig,
        data: updatedGig,
        success: true,
        message: response.message,
      });
      
      // Also update in the list queries
      queryClient.setQueriesData(
        { queryKey: gigKeys.lists() },
        (old) => {
          if (!old) return old;
          
          if (old.data && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map(gig => 
                gig._id === variables.id ? { ...gig, ...updatedGig } : gig
              ),
            };
          }
          
          if (old.gigs && Array.isArray(old.gigs)) {
            return {
              ...old,
              gigs: old.gigs.map(gig => 
                gig._id === variables.id ? { ...gig, ...updatedGig } : gig
              ),
            };
          }
          
          return old;
        }
      );
      
      toast.success(response.message || 'Gig updated successfully!');
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousGig) {
        queryClient.setQueryData(gigKeys.detail(variables.id), context.previousGig);
      }
      
      toast.error(err.message || 'Failed to update gig');
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
      let errorMessage = error.data?.message || error.message || 'Failed to delete gig';
      
      if (error.code === 'GIG_IN_PROGRESS') {
        errorMessage = 'Cannot delete gig that is in progress. Use force delete if necessary.';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to delete this gig';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
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
      let errorMessage = error.message || 'Failed to update gig status';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to update gig status';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
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
      let errorMessage = error.message || 'Failed to update gigs status';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to update gig status';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
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
      let errorMessage = error.data?.message || error.message || 'Failed to restore gig';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to restore gig';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
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
    retryDelay: 1000,
    onError: (error) => {
      if (error.code === 'SESSION_EXPIRED') {
        toast.error('Session expired. Please login again.');
      }
    }
  });
};

export const useSearchGigs = (searchParams = {}) => {
  return useQuery({
    queryKey: gigKeys.search(searchParams),
    queryFn: () => gigsAPI.search(searchParams),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: Boolean(searchParams.query?.trim()),
    onError: (error) => {
      if (error.code === 'SESSION_EXPIRED') {
        toast.error('Session expired. Please login again.');
      }
    }
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
      let errorMessage = error.data?.message || error.message || 'Failed to export gigs';
      
      if (error.code === 'EXPORT_LIMIT_EXCEEDED') {
        errorMessage = 'Export limit exceeded. Please use filters to reduce the number of records.';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to export gigs';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
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
      let errorMessage = error.message || 'Failed to upload images';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to upload images';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
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
      let errorMessage = error.message || 'Failed to remove image';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to remove images';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
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
      let errorMessage = error.message || 'Failed to set thumbnail';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to update thumbnail';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
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
      let errorMessage = error.message || 'Failed to upload thumbnail';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to upload thumbnail';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
  });
};

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